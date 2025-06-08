//-- Injectable content-script (refreshed on every page reload without extension-reload)

import "../setup";
import "./content-script.scss"
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { action, computed, makeObservable, observable, toJS } from "mobx";
import { observer } from "mobx-react";
import debounce from 'lodash/debounce';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import orderBy from 'lodash/orderBy';
import { contentScriptInjectable } from "../common-vars";
import { preloadAppData } from "../preloadAppData";
import { autoBind, disposer, getHotkey } from "../utils";
import { getManifest, getURL, isRuntimeContextInvalidated, MessageType, onMessage, ProxyResponseType, TranslatePayload } from "../extension";
import { proxyRequest } from "../background/httpProxy.bgc";
import { popupHotkey, settingsStore } from "../components/settings/settings.storage";
import { getNextTranslator, getTranslator, ITranslationError, ITranslationResult, ProviderCodeName } from "../providers";
import { XTranslateIcon } from "./xtranslate-icon";
import { XTranslateTooltip } from "./xtranslate-tooltip";
import { Popup } from "../components/popup/popup";
import { PageTranslator } from "./page-translator";

type DOMRectNormalized = Omit<Writeable<DOMRect>, "toJSON" | "x" | "y">;

@observer
export class ContentScript extends React.Component {
  static window: Window;
  static rootElem: HTMLElement;
  static cssStylesUrl: string;

  static async init(window: Window = globalThis.window.self) {
    this.window = window;
    this.umount();
    await preloadAppData(); // wait for dependent data before first render
    await this.preloadCss();

    const appElem = window.document.createElement("div");
    appElem.classList.add("XTranslate");
    appElem.style.all = "unset"; // reset possible css-collisions with global page styles
    ContentScript.rootElem = appElem;

    const shadowRoot = appElem.attachShadow({ mode: "closed" });
    const rootNode = createRoot(shadowRoot);
    const appRootNode = createRoot(appElem);
    window.document.body.appendChild(appElem);

    appRootNode.render(<link rel="stylesheet" href={this.cssStylesUrl}/>);
    rootNode.render(<ContentScript/>);
  }

  static umount() {
    const appElem = this.window.document.querySelector(".XTranslate");
    if (appElem) appElem.parentElement.removeChild(appElem);
  }

  static async preloadCss() {
    const cssStyles = await proxyRequest<string>({
      url: getURL(`${contentScriptInjectable}.css`),
      responseType: ProxyResponseType.TEXT,
    });
    this.cssStylesUrl = URL.createObjectURL(
      new Blob([cssStyles], { type: "text/css" }),
    );
  }

  static get isTopFrame() {
    return this.window === window.top;
  }

  constructor(props: object) {
    super(props);
    makeObservable(this);
    autoBind(this);
  }

  private unload = disposer();
  public appName = getManifest().name;
  private selection = ContentScript.window.getSelection();
  private popup: Popup;
  private isDblClicked = false;
  private isHotkeyActivated = false;
  private mousePos = { x: 0, y: 0 };
  private mouseTarget: HTMLElement = document.body;
  private pageTranslator = new PageTranslator();
  private tooltipRef = React.createRef<HTMLElement>();

  @observable.ref lastParams: TranslatePayload; // last used translation payload
  @observable.ref translation: ITranslationResult;
  @observable.ref error: ITranslationError;
  @observable.ref selectionRects: DOMRectNormalized[];
  @observable popupPosition: React.CSSProperties = {};
  @observable selectedText = "";
  @observable isRtlSelection = false;
  @observable isIconVisible = false;
  @observable isLoading = false;

  async componentDidMount() {
    this.bindEvents();

    if (this.pageTranslator.isAlwaysTranslate(document.URL)) {
      this.startPageAutoTranslation();
    }
  }

  private getShadowDomElements(rootElem = document.body) {
    return Array.from(rootElem.querySelectorAll("*")).filter(elem => elem.shadowRoot) as HTMLElement[];
  }

  private bindEvents() {
    const window = ContentScript.window;
    const document = window.document;
    const abortCtrl = new AbortController();
    const signal = abortCtrl.signal;

    // Bind DOM events
    document.addEventListener("selectionchange", this.onSelectionChange, { signal });
    document.addEventListener("mousemove", this.onMouseMove, { signal, capture: true });
    document.addEventListener("mousedown", this.onMouseDown, { signal, capture: true });
    document.addEventListener("dblclick", this.onDoubleClick, { signal, capture: true });
    document.addEventListener("keydown", this.onKeyDown, { signal, capture: true });
    window.addEventListener("scroll", this.updatePopupPositionLazy, { signal });
    window.addEventListener("resize", this.updatePopupPositionLazy, { signal });

    this.unload.push(
      function unbindDOMEvents() {
        abortCtrl.abort();
      },
      onMessage(MessageType.TRANSLATE_FULL_PAGE, this.togglePageAutoTranslation),
      onMessage(MessageType.GET_SELECTED_TEXT, this.getSelectedTextAction),
      () => this.stopPageAutoTranslation(),
    );
  }

  async checkContextInvalidationError(): Promise<void> {
    const isInvalidated = await isRuntimeContextInvalidated();
    if (isInvalidated) {
      // unload previous content-script artifacts in case of "context invalidated" error
      this.unload();
    }
  }

  @computed get isPopupHidden() {
    return !(this.translation || this.error);
  }

  @computed get iconPosition(): React.CSSProperties {
    const { iconPosition } = settingsStore.data;
    const { selectionRects, isRtlSelection } = this;
    const firstRect = selectionRects[0];
    const lastRect = selectionRects.slice(-1)[0];

    if (!isEmpty(iconPosition)) {
      const top = iconPosition.top ? orderBy(selectionRects, "top", "asc")[0].top : undefined;
      const left = iconPosition.left ? orderBy(selectionRects, "left", "asc")[0].left : undefined;
      const right = iconPosition.right ? orderBy(selectionRects, "right", "desc")[0].right : undefined;
      const bottom = iconPosition.bottom ? orderBy(selectionRects, "bottom", "desc")[0].bottom : undefined;

      return {
        left: left ?? right,
        top: top ?? bottom,
        transform: `translate(${left ? -100 : 0}%, ${top ? -100 : 0}%)`,
      }
    }

    return {
      left: isRtlSelection ? firstRect.left : lastRect.right,
      top: isRtlSelection ? firstRect.top : lastRect.bottom,
      transform: isRtlSelection ? "translate(-100%, -100%)" : undefined,
    }
  }

  translateLazy = debounce(this.translate, 250);

  @action
  async translate(params: Partial<TranslatePayload> = {}) {
    void this.checkContextInvalidationError();

    this.isLoading = true;
    this.translation = null;
    this.error = null;

    try {
      const payload = this.lastParams = {
        provider: params.provider ?? settingsStore.data.vendor,
        from: params.from ?? settingsStore.data.langFrom,
        to: params.to ?? settingsStore.data.langTo,
        text: params.text ?? this.selectedText.trim(),
      };

      const translation = await getTranslator(payload.provider).translate(payload);
      if (isEqual(payload, this.lastParams)) {
        this.translation = translation;
      }
    } catch (err) {
      this.error = err;
    } finally {
      this.isLoading = false;
      this.refinePosition();
    }
  }

  translateWith(provider: ProviderCodeName) {
    return this.translate({
      ...(this.lastParams ?? {}),
      provider,
    });
  }

  translateNext(reverse = false) {
    if (!this.lastParams) return;

    const { provider, from, to } = this.lastParams;
    const nextTranslator = getNextTranslator(provider, from, to, reverse);

    return this.translate({
      ...this.lastParams,
      provider: nextTranslator.name,
    });
  }

  private getSelectedTextAction() {
    return this.selectedText;
  }

  private togglePageAutoTranslation() {
    const pageUrl = document.URL;
    const autoTranslate = this.pageTranslator.isAlwaysTranslate(pageUrl);

    if (autoTranslate) {
      this.stopPageAutoTranslation(pageUrl);
    } else {
      this.startPageAutoTranslation(pageUrl);
    }
  }

  @action
  private startPageAutoTranslation(pageUrl?: string) {
    if (pageUrl && ContentScript.isTopFrame) {
      this.pageTranslator.setAutoTranslatingPages({ enabled: [pageUrl] });
    }
    this.pageTranslator.startAutoTranslation();
  }

  @action
  private stopPageAutoTranslation(pageUrl?: string) {
    if (pageUrl) this.pageTranslator.setAutoTranslatingPages({ disabled: [pageUrl] });
    this.pageTranslator.stopAutoTranslation();
    this.setTooltipHTML("");
  }

  playText() {
    if (!this.translation) return;
    const { vendor, originalText, langDetected } = this.translation;
    return getTranslator(vendor).speak(langDetected, originalText);
  }

  showIcon() {
    void this.checkContextInvalidationError();
    this.isIconVisible = true;
  }

  hideIcon() {
    this.isIconVisible = false;
  }

  @action
  hidePopup() {
    if (this.isPopupHidden) {
      return;
    }
    if (this.translation) {
      getTranslator(this.translation.vendor).stopSpeaking();
    }
    this.translation = null;
    this.error = null;
    this.popupPosition = null;
    this.selectionRects = null;
    this.isDblClicked = false;
    this.isHotkeyActivated = false;
    this.selection.removeAllRanges();
  }

  static isEditableElement(elem: Element) {
    return elem instanceof HTMLInputElement
      || elem instanceof HTMLTextAreaElement
      || (elem as HTMLElement).isContentEditable;
  }

  static isOutsideRenderRoot(elem: HTMLElement): boolean {
    return !ContentScript.rootElem.contains(elem);
  }

  normalizeRect(rect: DOMRect, { withScroll = false } = {}): DOMRectNormalized {
    let { left, top, width, height } = rect;
    if (withScroll) {
      left += ContentScript.window.scrollX;
      top += ContentScript.window.scrollY;
    }
    return {
      left, top, width, height,
      right: left + width,
      bottom: top + height,
    };
  }

  saveSelectionRects() {
    let { selection, mouseTarget } = this;
    const rootParent = mouseTarget?.getRootNode();
    const isShadowDOMInternals = rootParent instanceof ShadowRoot;

    if (isShadowDOMInternals) {
      // @ts-ignore "get text selection from shadow-root node"
      selection = rootParent.getSelection();
    }

    if (selection.rangeCount > 0) {
      let { anchorOffset, anchorNode, focusNode, focusOffset } = selection;
      const range = selection.getRangeAt(0);
      if (anchorNode !== focusNode) {
        const commonAncestorText = range.commonAncestorContainer.textContent;
        anchorOffset = commonAncestorText.indexOf(anchorNode.textContent);
        focusOffset = commonAncestorText.indexOf(focusNode.textContent);
      }
      const rects = Array.from(range.getClientRects());
      if (!rects.length) {
        if (ContentScript.isEditableElement(document.activeElement)) {
          rects.push(document.activeElement.getBoundingClientRect());
        } else if (focusNode === anchorNode && focusNode instanceof HTMLElement) {
          rects.push(focusNode.getBoundingClientRect());
        } else {
          rects.push(range.getBoundingClientRect());
        }
      }
      this.selectionRects = rects.map(rect => this.normalizeRect(rect));
      this.isRtlSelection = anchorOffset > focusOffset;
    } else if (this.selectionRects) {
      this.selectionRects = null;
      this.isRtlSelection = false;
    }
  }

  @action
  refinePosition() {
    const hasAutoPosition = settingsStore.data.popupPosition === "";
    if (!hasAutoPosition || !this.selectionRects) {
      return; // skip: no position refining is needed
    }

    const { window } = ContentScript;
    const { selectionRects } = this;
    const { top: selectionTop } = selectionRects[0];
    const { bottom: selectionBottom } = selectionRects.slice(-1)[0];
    const selectionLeft = Math.min(...selectionRects.map(({ left }) => left));
    const selectionRight = Math.max(...selectionRects.map(({ right }) => right));
    const viewPortWidth = window.innerWidth;
    const viewPortHeight = window.innerHeight;

    // set initial popup position under selected text
    this.popupPosition = {
      left: selectionLeft,
      top: selectionBottom,
    }

    // make correction if popup is out of viewport bonds
    window.requestAnimationFrame(action(() => {
      if (!this.popup) return;
      const popupPos = this.popup.elem.getBoundingClientRect();
      const isOutByX = popupPos.right > viewPortWidth;
      const isOutByY = popupPos.bottom > viewPortHeight;

      if (isOutByX) {
        delete this.popupPosition.left;
        const right = viewPortWidth - selectionRight
        this.popupPosition.right = (right + popupPos.width) < viewPortWidth ? right : 0;
      }
      if (isOutByY) {
        delete this.popupPosition.top;
        const bottom = viewPortHeight - selectionTop;
        this.popupPosition.bottom = (bottom + popupPos.height) < viewPortHeight ? bottom : 0;
      }
    }));
  }

  private setTooltipHTML(...htmlChunks: React.ReactNode[]): void {
    this.tooltipRef.current.innerHTML = htmlChunks.filter(Boolean).join("<hr/>");
  }

  refreshTranslationTooltip() {
    const tooltipElem = this.tooltipRef.current;
    const { showTranslationOnHover, showOriginalOnHover } = settingsStore.data.fullPageTranslation;
    const showTooltip = Boolean(showTranslationOnHover || showOriginalOnHover) && this.pageTranslator.isEnabled;
    if (!showTooltip) {
      return;
    }

    const targetElem = this.mouseTarget.closest("[data-xtranslate-tooltip]");
    if (targetElem) {
      const { left, top, height } = targetElem.getBoundingClientRect();
      const tooltipTranslation = targetElem.getAttribute("data-xtranslate-translation");
      const tooltipOriginalText = targetElem.getAttribute("data-xtranslate-original");

      tooltipElem.style.left = `${left}px`;
      tooltipElem.style.top = `${top + height}px`;
      this.setTooltipHTML(tooltipOriginalText, tooltipTranslation);
    } else if (!tooltipElem.matches(":empty")) {
      this.setTooltipHTML("");
    }
  }

  isClickedOnSelection() {
    if (!this.selectedText || !this.selectionRects) return;
    const { x, y } = this.mousePos;

    return this.selectionRects.some(({ left, top, right, bottom }) => {
      return left <= x && x <= right && top <= y && y <= bottom;
    });
  }

  onSelectionChange = debounce(action(() => {
    this.selectedText = this.selection.toString().trim();
    if (ContentScript.isEditableElement(document.activeElement) || !this.selectedText) {
      return;
    }
    const { showPopupAfterSelection, showIconNearSelection, showPopupOnDoubleClick } = settingsStore.data;
    if (showPopupAfterSelection) {
      this.saveSelectionRects();
      this.translateLazy();
    } else if (this.isPopupHidden) {
      this.saveSelectionRects();
      const showOnDoubleClick = showPopupOnDoubleClick && this.isDblClicked;
      if (showOnDoubleClick || this.isHotkeyActivated || this.isLoading) {
        this.translate();
      } else if (showIconNearSelection) {
        this.showIcon();
      }
    }
  }), 250);

  onIconClick(evt: React.MouseEvent) {
    this.hideIcon();
    void this.translate();
    evt.stopPropagation();
  }

  private getMouseTargetTopElem(evt: MouseEvent): HTMLElement {
    return evt.composedPath()[0] as HTMLElement;
  }

  onMouseMove(evt: MouseEvent) {
    const { clientX, clientY } = evt;

    this.mousePos.x = clientX;
    this.mousePos.y = clientY;
    this.mouseTarget = this.getMouseTargetTopElem(evt);
    this.refreshTranslationTooltip();
  }

  onMouseDown(evt: MouseEvent) {
    const clickedElem = evt.target as HTMLElement;
    const rightBtnClick = evt.button === 2;
    if (rightBtnClick) return;

    if (ContentScript.isOutsideRenderRoot(clickedElem)) {
      this.hideIcon();
      !this.isLoading && this.hidePopup();
    }

    if (settingsStore.data.showPopupOnClickBySelection && this.isClickedOnSelection()) {
      void this.translate();
      evt.preventDefault();
    }
  }

  onDoubleClick(evt: MouseEvent) {
    if (settingsStore.data.showPopupOnDoubleClick) {
      this.isDblClicked = true;
    }
  }

  @action
  onKeyDown = (evt: KeyboardEvent) => {
    if (!this.isPopupHidden) {
      switch (evt.code) {
      case "Escape":
        this.hidePopup();
        evt.stopPropagation();
        break;
      case "ArrowLeft":
        this.translateNext(true);
        evt.stopImmediatePropagation();
        evt.preventDefault();
        break;
      case "ArrowRight":
        this.translateNext();
        evt.stopImmediatePropagation();
        evt.preventDefault();
        break;
      }
    }

    // handle text translation by hotkey
    if (!settingsStore.data.showPopupOnHotkey) return;
    const pressedHotkey = getHotkey(evt);
    const userHotkey = toJS(popupHotkey.get().hotkey);

    if (isEqual(userHotkey, pressedHotkey) && this.isPopupHidden) {
      evt.preventDefault();
      this.isHotkeyActivated = true;
      this.translateFromTopElement();
    }
  }

  private translateFromTopElement() {
    let { selectedText: text, mouseTarget } = this;

    const notRoot = mouseTarget !== document.documentElement && mouseTarget !== document.body;
    const autoSelectText = !text && notRoot && ContentScript.isOutsideRenderRoot(mouseTarget);

    if (autoSelectText) {
      if (["input", "textarea", "img"].includes(mouseTarget.nodeName.toLowerCase())) {
        if (mouseTarget instanceof HTMLInputElement || mouseTarget instanceof HTMLTextAreaElement) {
          text = mouseTarget.value || mouseTarget.placeholder;
        }
        if (mouseTarget instanceof HTMLImageElement) {
          text = mouseTarget.title || mouseTarget.alt;
        }
        if (text) {
          this.selectionRects = [this.normalizeRect(mouseTarget.getBoundingClientRect())];
        }
      } else {
        mouseTarget.style.userSelect = "auto"; // make sure selection is not blocked from css
        this.selection.selectAllChildren(mouseTarget);
        this.saveSelectionRects();
        text = this.selection.toString().trim();
        mouseTarget.style.userSelect = null;
      }
    }

    if (text) {
      this.translateLazy({ text });
    }
  }

  updatePopupPositionLazy = debounce(action(() => {
    if (!this.isPopupHidden) this.saveSelectionRects();
    this.refinePosition();
  }), 250);

  render() {
    const { translation, error, popupPosition, playText, onIconClick, isIconVisible } = this;
    const { langFrom, langTo, vendor } = settingsStore.data;
    const translator = getTranslator(vendor);
    return (
      <>
        <link rel="stylesheet" href={ContentScript.cssStylesUrl}/>
        {isIconVisible && (
          <XTranslateIcon
            style={this.iconPosition}
            onMouseDown={onIconClick}
            title={`${this.appName}: ${translator.getLangPairTitle(langFrom, langTo)}`}
          />
        )}
        <XTranslateTooltip ref={this.tooltipRef}/>
        <Popup
          style={popupPosition}
          translation={translation}
          error={error}
          onPlayText={playText}
          lastParams={this.lastParams}
          onProviderChange={this.translateWith}
          tooltipParentElem={ContentScript.rootElem}
          ref={(ref: Popup) => {
            this.popup = ref
          }}
        />
      </>
    )
  }
}

// render app
await ContentScript.init();
