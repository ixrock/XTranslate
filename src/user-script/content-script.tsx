//-- Content script (injected at every webpage/frame)

import "./content-script.scss";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { action, computed, makeObservable, observable, toJS } from "mobx";
import { observer } from "mobx-react";
import debounce from 'lodash/debounce';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import orderBy from 'lodash/orderBy';
import { autoBind, disposer, getHotkey } from "../utils";
import { getManifest, getURL, MessageType, onMessage, proxyRequest, ProxyResponseType, TranslateWithVendorPayload } from "../extension";
import { getNextTranslator, getTranslator, ITranslationError, ITranslationResult, TranslatePayload } from "../vendors";
import { XTranslateIcon } from "./xtranslate-icon";
import { Popup } from "../components/popup/popup";
import { preloadAppData } from "../preloadAppData";
import { settingsStore } from "../components/settings/settings.storage";
import { contentScriptEntry } from "../common-vars";

@observer
export class ContentScript extends React.Component {
  static window: Window;
  static rootElem: HTMLElement;
  static rootNode: Root;

  static async init(window: Window = globalThis.window.self) {
    await preloadAppData();

    ContentScript.window = window;
    ContentScript.rootElem = window.document.createElement("div");
    const appElem = ContentScript.rootElem;
    appElem.classList.add("XTranslate");

    const shadowRoot = appElem.attachShadow({ mode: "closed" });
    const rootNode = createRoot(shadowRoot);
    window.document.documentElement.appendChild(appElem);
    ContentScript.rootNode = rootNode;

    // wait for dependent data before first render
    rootNode.render(<ContentScript/>);
  }

  constructor(props: object) {
    super(props);
    makeObservable(this);
    autoBind(this);
    this.preloadCss();
  }

  public appName = getManifest().name;
  private selection = ContentScript.window.getSelection();
  private popup: Popup;
  private icon: XTranslateIcon | null;
  private isDblClicked = false;
  private isHotkeyActivated = false;
  private mousePos = { x: 0, y: 0, pageX: 0, pageY: 0 };

  // Unload previous content script (e.g. in case of "context invalidated" error on extension update to new version)
  private unloadContentScript = disposer();

  @observable.ref translation: ITranslationResult;
  @observable.ref error: ITranslationError;
  @observable.ref selectionRects: WritableDOMRect[];
  @observable lastParams: Partial<ITranslationResult> = {}; // last used params in getting translation attempt
  @observable popupPosition: React.CSSProperties = {};
  @observable selectedText = "";
  @observable isRtlSelection = false;
  @observable isIconShown = false;
  @observable isLoading = false;
  @observable stylesUrl = "";

  async preloadCss() {
    const styles = await proxyRequest<string>({
      url: getURL(`${contentScriptEntry}.css`),
      responseType: ProxyResponseType.TEXT,
    });

    this.stylesUrl = URL.createObjectURL(
      new Blob([styles], { type: "text/css" }),
    );
  }

  componentDidMount() {
    this.bindEvents();
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

    this.unloadContentScript.push(
      () => {
        ContentScript.rootElem.parentElement.removeChild(ContentScript.rootElem);
        ContentScript.rootNode.unmount();
      },

      () => abortCtrl.abort(), // unbind DOM-events

      onMessage<void, string>(MessageType.GET_SELECTED_TEXT, () => {
        return this.selectedText;
      }),
      onMessage(MessageType.TRANSLATE_WITH_VENDOR, ({ vendor, text }: TranslateWithVendorPayload) => {
        this.hideIcon();
        this.translate({ vendor, text });
      })
    );
  }

  @computed get isPopupHidden() {
    return !(this.translation || this.error);
  }

  @computed get iconPosition(): React.CSSProperties {
    const { iconPosition } = settingsStore.data;
    const { selectedText, selectionRects, isRtlSelection, isIconShown } = this;
    if (!selectedText || !selectionRects || !isIconShown || !this.isPopupHidden) {
      return {
        display: "none"
      }
    }

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
  async translate({ vendor, from, to, text }: Partial<TranslatePayload> = {}) {
    this.lastParams = {
      vendor: vendor ?? settingsStore.data.vendor,
      langFrom: from ?? settingsStore.data.langFrom,
      langTo: to ?? settingsStore.data.langTo,
      originalText: text ?? this.selectedText.trim(),
    };

    try {
      const { vendor, langTo: to, langFrom: from, originalText: text } = this.lastParams;
      this.isLoading = true;
      this.translation = null;
      this.error = null;
      this.translation = await getTranslator(vendor).translate({ to, from, text });
    } catch (err) {
      const reloadingContentScriptsRequired = (
        err instanceof Error &&
        err.message.includes("Extension context invalidated")
      );
      if (reloadingContentScriptsRequired) {
        this.unloadContentScript();
      }
      this.error = err;
    } finally {
      this.isLoading = false;
      this.refinePosition();
    }
  }

  translateNext(reverse = false) {
    const { vendor, langFrom, langTo, originalText } = this.lastParams;

    const nextVendor = getNextTranslator(vendor, langFrom, langTo, reverse);
    return this.translate({
      vendor: nextVendor.name,
      from: langFrom,
      to: langTo,
      text: originalText,
    });
  }

  playText() {
    const {
      vendor, originalText,
      langDetected = this.lastParams.langFrom,
    } = this.translation ?? this.lastParams;

    return getTranslator(vendor).speak(langDetected, originalText);
  }

  showIcon() {
    this.isIconShown = true;
  }

  hideIcon() {
    this.isIconShown = false;
  }

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

  normalizeRect(rect: DOMRect, { withScroll = false } = {}): WritableDOMRect {
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
    if (this.selection.rangeCount > 0) {
      let { anchorOffset, anchorNode, focusNode, focusOffset } = this.selection;
      const range = this.selection.getRangeAt(0);
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
    if (settingsStore.data.popupPosition || !this.selectionRects) {
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

  isClickedOnSelection() {
    if (!this.selectedText || !this.selectionRects) return;
    const { x, y } = this.mousePos;

    return this.selectionRects.some(({ left, top, right, bottom }) => {
      return left <= x && x <= right && top <= y && y <= bottom;
    });
  }

  onSelectionChange = debounce(() => {
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
  }, 250);

  onIconClick(evt: React.MouseEvent) {
    void this.translate();
    evt.stopPropagation();
  }

  onMouseMove({ clientX, clientY, pageX, pageY }: MouseEvent) {
    this.mousePos.x = clientX; // relative to viewport
    this.mousePos.y = clientY;
    this.mousePos.pageX = pageX; // with page scroll
    this.mousePos.pageY = pageY;
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
    if (!settingsStore.data.showPopupOnHotkey) {
      return;
    }
    const pressedHotkey = getHotkey(evt);
    const userHotkey = toJS(settingsStore.data.hotkey);
    if (isEqual(userHotkey, pressedHotkey) && this.isPopupHidden) {
      evt.preventDefault();
      this.isHotkeyActivated = true;

      let text = this.selectedText;
      const mouseTarget = document.elementFromPoint(this.mousePos.x, this.mousePos.y) as HTMLElement;
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
  }

  updatePopupPositionLazy = debounce(() => {
    if (!this.isPopupHidden) this.saveSelectionRects();
    this.refinePosition();
  }, 250);

  render() {
    const { lastParams, translation, error, popupPosition, playText, translateNext, onIconClick, hidePopup } = this;
    const { langFrom, langTo, vendor } = settingsStore.data;
    const translator = getTranslator(vendor);
    return (
      <>
        <link rel="stylesheet" href={this.stylesUrl} crossOrigin="anonymous"/>
        <XTranslateIcon
          style={this.iconPosition}
          onMouseDown={onIconClick}
          title={`${this.appName}: ${translator.getLangPairTitle(langFrom, langTo)}`}
          ref={elem => {
            this.icon = elem
          }}
        />
        <Popup
          style={popupPosition}
          initParams={lastParams}
          translation={translation}
          error={error}
          onPlayText={playText}
          onTranslateNext={() => translateNext()}
          onClose={hidePopup}
          tooltipParent={ContentScript.rootElem}
          ref={(ref: Popup) => {
            this.popup = ref
          }}
        />
      </>
    )
  }
}
