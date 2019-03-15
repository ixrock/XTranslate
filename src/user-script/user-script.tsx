//-- User script app (page context)

import React from "react";
import { render } from "react-dom";
import { computed, observable, toJS, when } from "mobx";
import { observer } from "mobx-react";
import { debounce, isEqual } from "lodash"
import { autobind, cssNames, getHotkey, prevDefault } from "../utils";
import { getManifest, getURL, MenuTranslateFavoritePayload, MenuTranslateVendorPayload, Message, MessageType, onMessage, PlayTextToSpeechPayload, sendMessage } from "../extension";
import { getNextTranslator, getTranslator, ITranslationError, ITranslationResult } from "../vendors";
import ReactShadow from "react-shadow"
import { Icon } from "../components/icon";
import { XTranslateIcon } from "./xtranslate-icon";
import { ITranslateParams, Popup } from "../components/popup/popup";
import { settingsStore } from "../components/settings/settings.store";
import { themeStore } from "../components/theme-manager/theme.store";
import { userHistoryStore } from "../components/user-history/user-history.store";

const isPdf = document.contentType === "application/pdf";

@observer
class App extends React.Component {
  static rootElem = document.createElement("div");

  static async init() {
    var appContainer = App.rootElem;
    appContainer.className = "XTranslate";
    document.documentElement.appendChild(appContainer);
    await when(() => settingsStore.isLoaded && themeStore.isLoaded);
    render(<App/>, appContainer);
  }

  public appName = getManifest().name;
  private settings = settingsStore.data;
  private selection = window.getSelection();
  private style = getURL('pageStyle.css');
  private popup: Popup;
  private icon: Icon;
  private mouseTarget: HTMLElement;
  private lastParams: ITranslateParams;
  private isDblClicked = false;
  private isHotkeyActivated = false;

  @observable.ref translation: ITranslationResult;
  @observable.ref error: ITranslationError;
  @observable.ref selectionRects: ClientRect[];
  @observable position: Partial<ClientRect> = {};
  @observable selectedText = "";
  @observable isRtlSelection = false;
  @observable isIconShown = false;
  @observable isLoading = false;

  componentDidMount() {
    document.addEventListener("selectionchange", this.onSelectionChange);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("dblclick", this.onDoubleClick);
    document.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this.onResizeWindow);
    onMessage(this.onContextMenu);
    onMessage(this.onGetSelectedText);
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
    }
    else {
      var { right, bottom } = selectionRects.slice(-1)[0];
      return {
        left: right,
        top: bottom,
      }
    }
  }

  translateLazy = debounce(this.translate, 250);

  @autobind()
  async translate(params?: Partial<ITranslateParams>) {
    var { vendor, langFrom, langTo, autoPlayText, historyEnabled } = this.settings;
    params = Object.assign({
      vendor: vendor,
      from: langFrom,
      to: langTo,
      text: this.selectedText,
    }, params);
    var { vendor, from, to, text } = params;
    if (!text || isEqual(params, this.lastParams)) {
      return;
    }
    try {
      var translator = getTranslator(vendor);
      this.isLoading = true;
      this.lastParams = params as ITranslateParams;
      var translation = await translator.getTranslation(from, to, text);
      if (params === this.lastParams) {
        this.translation = translation;
        this.error = null;
        if (autoPlayText) setTimeout(this.playText);
        if (historyEnabled) userHistoryStore.saveTranslation(this.translation);
      }
    } catch (err) {
      this.error = err;
    }
    this.isLoading = false;
    this.refreshPosition();
  }

  @autobind()
  translateNext(reverse = false) {
    if (!this.lastParams) return;
    var { vendor, from, to, text } = this.lastParams;
    var nextTranslator = getNextTranslator(vendor, from, to, reverse);
    return this.translate({
      vendor: nextTranslator.name,
      from, to, text,
    });
  }

  @autobind()
  playText() {
    var { langDetected, langFrom, originalText, vendor } = this.translation;
    sendMessage<PlayTextToSpeechPayload>({
      type: MessageType.PLAY_TEXT_TO_SPEECH,
      payload: {
        vendor: vendor,
        lang: langDetected || langFrom,
        text: originalText
      }
    });
  }

  @autobind()
  stopPlaying() {
    sendMessage({
      type: MessageType.STOP_TTS_PLAYING
    });
  }

  showIcon() {
    this.isIconShown = true;
  }

  hideIcon() {
    this.isIconShown = false;
  }

  hidePopup() {
    if (this.isPopupHidden) return;
    this.translation = null;
    this.error = null;
    this.position = null;
    this.lastParams = null;
    this.selectionRects = null;
    this.isDblClicked = false;
    this.isHotkeyActivated = false;
    this.selection.removeAllRanges();
    this.stopPlaying();
  }

  isEditable(elem: Element) {
    return elem instanceof HTMLInputElement
      || elem instanceof HTMLTextAreaElement
      || (elem as HTMLElement).isContentEditable;
  }

  isOutsideOfPopup(elem: Element) {
    var popupHost = App.rootElem.querySelector(".popup-host");
    return !popupHost.contains(elem as HTMLElement);
  }

  normalizeRect(rect: ClientRect, withScroll = true): ClientRect {
    var { left, top, width, height } = rect;
    if (withScroll) {
      left += window.pageXOffset;
      top += window.pageYOffset;
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
        if (this.isEditable(document.activeElement)) {
          rects.push(document.activeElement.getBoundingClientRect());
        }
        else if (focusNode === anchorNode && focusNode instanceof HTMLElement) {
          rects.push(focusNode.getBoundingClientRect());
        }
        else {
          rects.push(range.getBoundingClientRect());
        }
      }
      this.selectionRects = rects.map(rect => this.normalizeRect(rect));
      this.isRtlSelection = anchorOffset > focusOffset;
    }
    else if (this.selectionRects) {
      this.selectionRects = null;
      this.isRtlSelection = false;
    }
  }

  refreshPosition() {
    var { popupFixedPos } = this.settings;
    if (popupFixedPos || !this.selectionRects) return;
    var { top } = this.selectionRects[0];
    var { left, bottom, right } = this.selectionRects.slice(-1)[0];
    this.position = {
      left: left,
      top: bottom,
    };
    var popupRect = this.popup.elem.getBoundingClientRect();
    var viewPort = {
      width: document.documentElement.clientWidth, // window.innerWidth + scrollbar
      height: document.documentElement.clientHeight, // window.innerHeight + scrollbar
    };
    if (popupRect.right > viewPort.width) {
      delete this.position.left;
      this.position.right = viewPort.width - right;
    }
    if (popupRect.bottom > viewPort.height) {
      delete this.position.top;
      this.position.bottom = -top;
    }
  }

  onSelectionChange = debounce(() => {
    this.selectedText = this.selection.toString().trim();

    if (this.isEditable(document.activeElement) || !this.selectedText) {
      return;
    }
    var { showPopupAfterSelection, showIconNearSelection, showPopupOnDoubleClick } = this.settings;
    if (showPopupAfterSelection) {
      this.saveSelectionRects();
      this.translateLazy();
    }
    else if (this.isPopupHidden) {
      this.saveSelectionRects();
      var showOnDoubleClick = showPopupOnDoubleClick && this.isDblClicked;
      if (showOnDoubleClick || this.isHotkeyActivated || this.isLoading) {
        this.translate();
      }
      else if (showIconNearSelection) {
        this.showIcon();
      }
    }
  }, 250);

  @autobind()
  onIconClick(evt: React.MouseEvent) {
    this.hideIcon();
    this.translate();
  }

  @autobind()
  onMouseMove(evt: MouseEvent) {
    this.mouseTarget = evt.target as HTMLElement;
  }

  @autobind()
  onMouseDown(evt: MouseEvent) {
    var clickedElem = evt.target as HTMLElement;
    var rightBtnClick = evt.button === 2;
    if (rightBtnClick) {
      return;
    }
    if (!this.icon.elem.contains(clickedElem)) {
      this.hideIcon();
    }
    if (this.isOutsideOfPopup(clickedElem)) {
      this.hidePopup();
    }
  }

  @autobind()
  onDoubleClick(evt: MouseEvent) {
    if (this.settings.showPopupOnDoubleClick) {
      this.isDblClicked = true;
    }
  }

  @autobind()
  onContextMenu(message: Message) {
    var { type } = message;
    if (type === MessageType.MENU_TRANSLATE_WITH_VENDOR) {
      this.hideIcon();
      let { vendor, selectedText } = message.payload as MenuTranslateVendorPayload;
      this.translate({ vendor, text: selectedText });
    }
    if (type === MessageType.MENU_TRANSLATE_FAVORITE) {
      this.hideIcon();
      let { vendor, from, to, selectedText } = message.payload as MenuTranslateFavoritePayload;
      this.translate({ vendor, from, to, text: selectedText });
    }
  }

  @autobind()
  onGetSelectedText(message: Message) {
    var { selectedText } = this;
    if (!selectedText) return;
    if (message.type === MessageType.GET_SELECTED_TEXT) {
      sendMessage({
        type: MessageType.SELECTED_TEXT,
        payload: selectedText,
      })
    }
  }

  @autobind()
  onKeyDown(evt: KeyboardEvent) {
    if (!this.isPopupHidden) {
      switch (evt.code) {
        case "Escape":
          this.hidePopup();
          evt.stopPropagation();
          break;
        case "ArrowLeft":
          this.translateNext(true);
          evt.preventDefault();
          break;
        case "ArrowRight":
          this.translateNext();
          evt.preventDefault();
          break;
      }
    }
    // handle text translation by hotkey
    if (!this.settings.showPopupOnHotkey) {
      return;
    }
    var hotkey = getHotkey(evt);
    var { keyCode, ...currentHotkey } = toJS(this.settings.hotkey);
    if (isEqual(currentHotkey, hotkey) && this.isPopupHidden) {
      evt.preventDefault();
      this.isHotkeyActivated = true;

      var text = this.selectedText;
      var enterElem = this.mouseTarget;
      var notRoot = enterElem !== document.documentElement && enterElem !== document.body;
      var autoSelectText = !text && notRoot && this.isOutsideOfPopup(enterElem);
      if (autoSelectText) {
        this.selection.selectAllChildren(enterElem);

        if (["input", "textarea", "img"].includes(enterElem.nodeName.toLowerCase())) {
          if (enterElem instanceof HTMLInputElement || enterElem instanceof HTMLTextAreaElement) {
            text = enterElem.value || enterElem.placeholder;
          }
          if (enterElem instanceof HTMLImageElement) {
            text = enterElem.title || enterElem.alt;
          }
          if (text) {
            this.selectionRects = [this.normalizeRect(enterElem.getBoundingClientRect())];
            this.translate({ text });
          }
        }
      }
      else if (text) {
        this.saveSelectionRects();
        this.translate();
      }
    }
  }

  onResizeWindow = debounce(() => {
    if (!this.isPopupHidden) this.saveSelectionRects();
    this.refreshPosition();
  }, 250)

  render() {
    var { translation, error, playText, translateNext, position, onIconClick, lastParams } = this;
    var { langFrom, langTo } = this.settings;
    return (
      <>
        <ReactShadow include={[this.style]}>
          <div className="popup-host">
            <Popup
              className={cssNames({ showInPdf: isPdf })}
              style={position}
              params={lastParams}
              translation={translation} error={error}
              onPlayText={playText}
              onTranslateNext={() => translateNext()}
              ref={e => this.popup = e}
            />
          </div>
        </ReactShadow>
        <XTranslateIcon
          style={this.iconPosition}
          onClick={prevDefault(onIconClick)}
          title={`${this.appName}: ${[langFrom, langTo].join(' → ').toUpperCase()}`}
          bindRef={e => this.icon = e}
        />
      </>
    )
  }
}

// init
App.init();
