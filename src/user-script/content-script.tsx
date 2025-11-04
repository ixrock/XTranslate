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
import { contentScriptInjectable } from "../config";
import { preloadAppData } from "../preloadAppData";
import { autoBind, disposer, getHotkey } from "../utils";
import { getManifest, getURL, isExtensionContextAlive, MessageType, onMessage, ProxyResponseType, TranslatePayload } from "../extension";
import { proxyRequest } from "../background/httpProxy.bgc";
import { sendMetric } from "../background/metrics.bgc";
import { popupHotkey, popupSkipInjectionUrls, settingsStore } from "../components/settings/settings.storage";
import { getNextTranslator, getTranslator, ITranslationError, ITranslationResult, ProviderCodeName } from "../providers";
import { XTranslateIcon } from "./xtranslate-icon";
import { XTranslateTooltip } from "./xtranslate-tooltip";
import { Popup } from "../components/popup/popup";
import { PageTranslator } from "./page-translator";
import { Icon } from "@/components/icon";

type DOMRectNormalized = Omit<Writeable<DOMRect>, "toJSON" | "x" | "y">;

@observer
export class ContentScript extends React.Component {
  static window: Window;
  static rootElem: HTMLElement;
  static rootNodes: Root[] = [];
  static cssStylesUrl: string;

  static async init(window: Window = globalThis.window.self) {
    await preloadAppData(); // wait for dependent data before first render
    await this.preloadCss();
    await popupSkipInjectionUrls.load();

    // skip content-script injection for specific urls to avoid bugs, e.g. for cloudflare captcha iframe checks
    const skipInjection = popupSkipInjectionUrls.get().some(url => window.document.URL.startsWith(url));
    if (skipInjection) return;

    const appElem = window.document.createElement("div");
    appElem.classList.add("XTranslate");
    appElem.style.all = "unset"; // reset possible css-collisions with global page styles

    const shadowRoot = appElem.attachShadow({ mode: "closed" });
    const rootNode = createRoot(shadowRoot);
    const appRootNode = createRoot(appElem);
    window.document.body.appendChild(appElem);

    this.window = window;
    this.rootElem = appElem;
    this.rootNodes.push(rootNode, appRootNode);

    appRootNode.render(<link rel="stylesheet" href={this.cssStylesUrl}/>);
    rootNode.render(<ContentScript/>);
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

  private unmount = disposer();
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
  @observable.ref selectionRects: DOMRectNormalized[] = [];
  @observable popupPosition: React.CSSProperties = {};
  @observable selectedText = "";
  @observable isSelectingText = false;
  @observable isRtlSelection = false;
  @observable isIconVisible = false;
  @observable isLoading = false;

  async componentDidMount() {
    this.bindEvents();

    if (this.pageTranslator.isEnabled) {
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

    this.unmount.push(
      function unmountDOM() {
        const { rootNodes, rootElem } = ContentScript;
        rootNodes.forEach(node => node.unmount());
        rootElem.parentElement.removeChild(rootElem);
      },
      function unbindDOMEvents() {
        abortCtrl.abort();
      },
      onMessage(MessageType.TRANSLATE_FULL_PAGE, this.togglePageAutoTranslation),
      onMessage(MessageType.GET_SELECTED_TEXT, this.getSelectedTextAction),
    );
  }

  private checkContextInvalidationError() {
    if (!isExtensionContextAlive()) {
      this.unmount(); // remove previous content-script rendered artifacts in case of "context invalidated" error
    }
  }

  @computed get isPopupHidden() {
    return !(this.translation || this.error);
  }

  @computed get iconPosition(): React.CSSProperties {
    const { iconPosition } = settingsStore.data;
    const { selectionRects, isRtlSelection } = this;
    const commonStyles = { position: "absolute", width: 25, height: 25 } as React.CSSProperties;

    if (!selectionRects.length) {
      return {};
    }

    // fixed position
    if (!isEmpty(iconPosition)) {
      const top = iconPosition.top ? orderBy(selectionRects, "top", "asc")[0].top : undefined;
      const left = iconPosition.left ? orderBy(selectionRects, "left", "asc")[0].left : undefined;
      const right = iconPosition.right ? orderBy(selectionRects, "right", "desc")[0].right : undefined;
      const bottom = iconPosition.bottom ? orderBy(selectionRects, "bottom", "desc")[0].bottom : undefined;

      return {
        ...commonStyles,
        left: left ?? right,
        top: top ?? bottom,
        transform: `translate(${left ? -100 : 0}%, ${top ? -100 : 0}%)`,
      }
    }

    const firstRect = selectionRects[0];
    const lastRect = selectionRects.slice(-1)[0];

    // auto-position
    return {
      ...commonStyles,
      left: isRtlSelection ? firstRect.left : lastRect.right,
      top: isRtlSelection ? firstRect.top : lastRect.bottom,
      transform: isRtlSelection ? "translate(-100%, -100%)" : undefined,
    }
  }

  translateLazy = debounce(this.translate, 250);

  @action
  async translate(params: Partial<TranslatePayload> = {}) {
    this.checkContextInvalidationError();
    this.hideIcon();

    const payload = this.lastParams = {
      provider: params.provider ?? settingsStore.data.vendor,
      from: params.from ?? settingsStore.data.langFrom,
      to: params.to ?? settingsStore.data.langTo,
      text: params.text ?? this.selectedText.trim(),
    };

    this.translation = null;
    this.error = null;
    this.isLoading = true;

    try {
      const translation = await getTranslator(payload.provider).translate(payload);
      if (isEqual(payload, this.lastParams)) {
        this.translation = translation;
      }
    } catch (err) {
      if (isEqual(payload, this.lastParams)) {
        this.error = err;
      }
    } finally {
      this.isLoading = false;
      this.refinePosition();
    }
  }

  async translateWith(provider: ProviderCodeName) {
    if (!this.lastParams) return;

    await this.translate({ ...this.lastParams, provider });

    void sendMetric("translate_action", {
      trigger: "provider_change"
    });
  }

  async translateNext({ reverse = false } = {}) {
    if (!this.lastParams) return;

    const { provider, from, to } = this.lastParams;
    const nextTranslator = getNextTranslator(provider, from, to, reverse);
    await this.translateWith(nextTranslator.name);
  }

  private getSelectedTextAction() {
    return this.selectedText;
  }

  private togglePageAutoTranslation() {
    if (this.pageTranslator.isEnabled) {
      this.stopPageAutoTranslation();
    } else {
      this.startPageAutoTranslation();
    }
  }

  @action
  private startPageAutoTranslation(pageUrl = document.URL) {
    const { provider, langTo, langFrom } = this.pageTranslator.settings;
    this.pageTranslator.startAutoTranslation();

    if (ContentScript.isTopFrame) {
      this.pageTranslator.setAutoTranslatingPages({ enabled: [pageUrl] });
    }

    void sendMetric("translate_used", {
      source: "fullpage",
      provider: provider,
      lang_from: langFrom,
      lang_to: langTo,
    });
  }

  @action
  private stopPageAutoTranslation(pageUrl = document.URL) {
    this.pageTranslator.setAutoTranslatingPages({ disabled: [pageUrl] });
    this.pageTranslator.stopAutoTranslation();
    this.setTooltipHTML(""); // reset
  }

  playText() {
    if (!this.translation) return;
    const { vendor, originalText, langDetected } = this.translation;
    void getTranslator(vendor).speak(langDetected, originalText);
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
    this.popupPosition = {};
    this.selectionRects = [];
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
    if (!hasAutoPosition || !this.selectionRects.length) {
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
    if (!this.tooltipRef.current) return; // might not exist after context-invalidated
    this.tooltipRef.current.innerHTML = htmlChunks.filter(Boolean).join("<hr/>");
  }

  refreshTranslationTooltip() {
    const tooltipElem = this.tooltipRef.current;
    const { showTranslationOnHover, showOriginalOnHover } = this.pageTranslator.settings;
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
    if (!this.selectedText || !this.selectionRects.length) return;
    const { x, y } = this.mousePos;

    return this.selectionRects.some(({ left, top, right, bottom }) => {
      return left <= x && x <= right && top <= y && y <= bottom;
    });
  }

  onSelectionEnd = debounce(() => this.isSelectingText = false, 100);

  onSelectionChange = action(() => {
    this.selectedText = this.selection.toString().trim();

    const isEditableElem = ContentScript.isEditableElement(document.activeElement);
    const emptyText = !this.selectedText;

    if (isEditableElem || emptyText) {
      this.isSelectingText = false;
      return;
    }

    this.isSelectingText = true;
    this.onSelectionEnd.cancel();
    this.handleTextSelection();
  });

  handleTextSelection = debounce(action(() => {
    const { showPopupAfterSelection, showIconNearSelection } = settingsStore.data;

    if (showPopupAfterSelection) {
      this.saveSelectionRects();
      this.translateLazy();
      void sendMetric("translate_action", { trigger: "selection_change" });
    } else if (this.isPopupHidden && !this.isHotkeyActivated) {
      this.saveSelectionRects();
      if (this.isDblClicked) {
        void this.translate();
        void sendMetric("translate_action", { trigger: "double_click" });
      } else if (showIconNearSelection) {
        this.showIcon();
      }
    }

    this.onSelectionEnd();
  }), 250);

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
      evt.preventDefault();
      void this.translate();
      void sendMetric("translate_action", { trigger: "selection_click" });
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
        void this.translateNext({ reverse: true });
        evt.stopImmediatePropagation();
        evt.preventDefault();
        break;
      case "ArrowRight":
        void this.translateNext({ reverse: false });
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
      void sendMetric("translate_action", { trigger: "hotkey" });
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

  onIconClick(evt: React.MouseEvent) {
    evt.stopPropagation();
    void this.translate();
    void sendMetric("translate_action", { trigger: "icon" });
  }

  showIcon() {
    this.checkContextInvalidationError();
    this.isIconVisible = true;
  }

  hideIcon() {
    this.isIconVisible = false;
  }

  renderIcon() {
    const { appName, onIconClick, isIconVisible, isLoading, iconPosition } = this;
    const { langFrom, langTo, vendor } = settingsStore.data;
    const translator = getTranslator(vendor);
    const translateIconTitle = `${appName}: ${translator.getLangPairTitle(langFrom, langTo)}`;

    return (
      <div style={iconPosition} inert={this.isSelectingText}>
        {isLoading && <Icon svg="spinner"/>}
        {!isLoading && isIconVisible && <XTranslateIcon onMouseDown={onIconClick} title={translateIconTitle}/>}
      </div>
    )
  }

  render() {
    const { translation, error, popupPosition, playText } = this;
    return (
      <>
        <link rel="stylesheet" href={ContentScript.cssStylesUrl}/>
        {this.renderIcon()}
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
