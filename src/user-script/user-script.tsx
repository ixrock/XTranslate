//-- User script app (page context)

import "./user-script.scss";
import "../setup";
import React from "react";
import { createRoot } from "react-dom/client";
import { action, computed, makeObservable, observable, toJS } from "mobx";
import { observer } from "mobx-react";
import { debounce, isEqual } from "lodash"
import { initAppData } from "../preload";
import { autoBind, getHotkey } from "../utils";
import { getManifest, getURL, MessageType, onMessage, proxyRequest, ProxyResponseType, TranslateWithVendorPayload } from "../extension";
import { getNextTranslator, getTranslator, ITranslationError, ITranslationResult, TranslatePayload } from "../vendors";
import { XTranslateIcon } from "./xtranslate-icon";
import { Popup } from "../components/popup/popup";
import { settingsStore } from "../components/settings/settings.storage";
import { contentScriptEntry, isPdf } from "../common-vars";
import "../../refs";

export type CustomDomRect = Partial<Writeable<DOMRect>>;

@observer
class App extends React.Component {
  static rootElem: HTMLElement;

  static async init(preloadDeps: () => Promise<void>) {
    await preloadDeps();

    const appElem = App.rootElem = document.createElement("div");
    appElem.classList.add("XTranslate");

    const shadowRoot = appElem.attachShadow({ mode: isPdf() ? "open" : "closed" });
    const rootNode = createRoot(shadowRoot);
    document.documentElement.appendChild(appElem);

    // wait for dependent data before first render
    rootNode.render(<App/>);
  }

  constructor(props: object) {
    super(props);
    makeObservable(this);
    autoBind(this);
    this.preloadCss();
  }

  public appName = getManifest().name;
  private selection = window.getSelection();
  private popup: Popup;
  private icon: XTranslateIcon | null;
  private isDblClicked = false;
  private isHotkeyActivated = false;
  private mousePos = { x: 0, y: 0, pageX: 0, pageY: 0 };

  @observable.ref translation: ITranslationResult;
  @observable.ref error: ITranslationError;
  @observable.ref selectionRects: CustomDomRect[];
  @observable lastParams: Partial<ITranslationResult> = {}; // last used params in getting translation attempt
  @observable position: CustomDomRect = {};
  @observable selectedText = "";
  @observable isRtlSelection = false;
  @observable isIconShown = false;
  @observable isLoading = false;
  @observable userStyle = "";

  // fix: <link rel crossOrigin/> is failed for opened local files
  async preloadCss() {
    this.userStyle = await proxyRequest({
      url: getURL(`${contentScriptEntry}.css`),
      responseType: ProxyResponseType.TEXT,
    });
  }

  componentDidMount() {
    // Bind extension's runtime IPC events
    onMessage<void, string>(MessageType.GET_SELECTED_TEXT, () => this.selectedText);

    onMessage(MessageType.TRANSLATE_WITH_VENDOR, ({ vendor, text }: TranslateWithVendorPayload) => {
      this.hideIcon();
      this.translate({ vendor, text });
    });

    // Bind DOM events
    document.addEventListener("selectionchange", this.onSelectionChange);
    document.addEventListener("mousemove", this.onMouseMove, true);
    document.addEventListener("mousedown", this.onMouseDown, true);
    document.addEventListener("dblclick", this.onDoubleClick, true);
    document.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("resize", this.onResizeWindow);
  }

  @computed get isPopupHidden() {
    return !(this.translation || this.error);
  }

  @computed get iconPosition(): React.CSSProperties {
    var { selectedText, selectionRects, isRtlSelection, isIconShown } = this;
    if (!selectedText || !selectionRects || !isIconShown || !this.isPopupHidden) {
      return {
        display: "none"
      }
    }
    if (isRtlSelection) {
      var { left, top } = selectionRects[0];
      return {
        left: left,
        top: top,
        transform: isRtlSelection ? "translate(-100%, -100%)" : undefined,
      }
    } else {
      var { right, bottom } = selectionRects.slice(-1)[0];
      return {
        left: right,
        top: bottom,
      }
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
      this.error = err;
    } finally {
      this.isLoading = false;
      this.refreshPosition();
    }
  }

  translateNext(reverse = false) {
    var { vendor, langFrom, langTo, originalText } = this.lastParams;

    var nextVendor = getNextTranslator(vendor, langFrom, langTo, reverse);
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
    this.position = null;
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
    return !App.rootElem.contains(elem);
  }

  getViewportSize() {
    return {
      width: document.documentElement.clientWidth, // window.innerWidth + scrollbar
      height: document.documentElement.clientHeight, // window.innerHeight + scrollbar
    }
  }

  normalizeRect(rect: DOMRect, withScroll = true): CustomDomRect {
    var { left, top, width, height } = rect;
    if (withScroll) {
      left += window.scrollX;
      top += window.scrollY;
    }
    return {
      left, top, width, height,
      right: left + width,
      bottom: top + height,
    };
  }

  saveSelectionRects() {
    if (this.selection.rangeCount > 0) {
      var { anchorOffset, anchorNode, focusNode, focusOffset } = this.selection;
      var range = this.selection.getRangeAt(0);
      if (anchorNode !== focusNode) {
        var commonAncestorText = range.commonAncestorContainer.textContent;
        anchorOffset = commonAncestorText.indexOf(anchorNode.textContent);
        focusOffset = commonAncestorText.indexOf(focusNode.textContent);
      }
      var rects = Array.from(range.getClientRects());
      if (!rects.length) {
        if (App.isEditableElement(document.activeElement)) {
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
  refreshPosition() {
    if (settingsStore.data.popupPosition || !this.selectionRects) {
      return; // skip: no position refining is needed
    }
    var { top } = this.selectionRects[0];
    var { bottom } = this.selectionRects.slice(-1)[0];
    var left = Math.min(...this.selectionRects.map(({ left }) => left));
    var right = Math.max(...this.selectionRects.map(({ right }) => right));
    var viewPort = this.getViewportSize();

    // available position
    var positions: CustomDomRect[] = [
      { left: left, top: bottom },
      { right: viewPort.width - right, bottom: -top }
    ];

    // apply first without viewport fitting check
    this.position = positions[0];

    // add initial position to the end in case of nothing will fit
    positions.slice(1).concat(positions[0])
      .forEach(({ left, right, top, bottom }) => {
        var popupPos = this.popup.elem.getBoundingClientRect();
        if (popupPos.left < 0 || popupPos.right > viewPort.width) {
          this.position.left = left;
          this.position.right = right;
        }
        if (popupPos.top < 0 || popupPos.bottom > viewPort.height) {
          this.position.top = top;
          this.position.bottom = bottom;
        }
      });
  }

  isClickedOnSelection() {
    if (!settingsStore.data.showPopupOnClickBySelection) return;
    if (!this.selectedText || !this.selectionRects) return;
    var { pageX, pageY } = this.mousePos;
    return this.selectionRects.some(({ left, top, right, bottom }) => {
      return left <= pageX && pageX <= right && top <= pageY && pageY <= bottom;
    });
  }

  onSelectionChange = debounce(() => {
    this.selectedText = this.selection.toString().trim();
    if (App.isEditableElement(document.activeElement) || !this.selectedText) {
      return;
    }
    var { showPopupAfterSelection, showIconNearSelection, showPopupOnDoubleClick } = settingsStore.data;
    if (showPopupAfterSelection) {
      this.saveSelectionRects();
      this.translateLazy();
    } else if (this.isPopupHidden) {
      this.saveSelectionRects();
      var showOnDoubleClick = showPopupOnDoubleClick && this.isDblClicked;
      if (showOnDoubleClick || this.isHotkeyActivated || this.isLoading) {
        this.translate();
      } else if (showIconNearSelection) {
        this.showIcon();
      }
    }
  }, 250);

  onIconClick(evt: React.MouseEvent) {
    this.hideIcon();
    this.translate();
    evt.stopPropagation();
  }

  onMouseMove({ clientX, clientY, pageX, pageY }: MouseEvent) {
    this.mousePos.x = clientX; // relative to viewport
    this.mousePos.y = clientY;
    this.mousePos.pageX = pageX; // with page scroll
    this.mousePos.pageY = pageY;
  }

  onMouseDown(evt: MouseEvent) {
    var clickedElem = evt.target as HTMLElement;
    var rightBtnClick = evt.button === 2;
    if (rightBtnClick) {
      return;
    }
    if (this.icon && !this.icon.elem.contains(clickedElem)) {
      this.hideIcon();
    }
    if (App.isOutsideRenderRoot(clickedElem)) {
      if (this.isPopupHidden && this.isClickedOnSelection()) {
        this.translate();
        evt.preventDefault(); // don't reset selection
      } else {
        this.hidePopup();
      }
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
    var hotkey = getHotkey(evt);
    var { keyCode, ...currentHotkey } = toJS(settingsStore.data.hotkey);
    if (isEqual(currentHotkey, hotkey) && this.isPopupHidden) {
      evt.preventDefault();
      this.isHotkeyActivated = true;

      var text = this.selectedText;
      var mouseTarget = document.elementFromPoint(this.mousePos.x, this.mousePos.y) as HTMLElement;
      var notRoot = mouseTarget !== document.documentElement && mouseTarget !== document.body;
      var autoSelectText = !text && notRoot && App.isOutsideRenderRoot(mouseTarget);
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

  onResizeWindow = debounce(() => {
    if (!this.isPopupHidden) this.saveSelectionRects();
    this.refreshPosition();
  }, 250);

  get popupPosition(): React.CSSProperties {
    if (isPdf()) {
      // shown always at left-top corner since impossible to detect page selection position in PDF-file natively
      return { margin: 20 };
    }

    return toJS(this.position);
  }

  render() {
    var { lastParams, translation, error, popupPosition, playText, translateNext, onIconClick, hidePopup } = this;
    var { langFrom, langTo, vendor } = settingsStore.data;
    var translator = getTranslator(vendor);
    return (
      <>
        <style type="text/css">{this.userStyle}</style>
        <XTranslateIcon
          style={this.iconPosition}
          onMouseDown={onIconClick}
          title={`${this.appName}: ${translator.getLangPairTitle(langFrom, langTo)}`}
          ref={e => this.icon = e}
        />
        <Popup
          style={popupPosition}
          initParams={lastParams}
          translation={translation}
          error={error}
          onPlayText={playText}
          onTranslateNext={() => translateNext()}
          onClose={hidePopup}
          tooltipParent={App.rootElem}
          ref={(ref: Popup) => this.popup = ref}
        />
      </>
    )
  }
}

// run content script
App.init(initAppData);
