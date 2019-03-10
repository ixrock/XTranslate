//-- User script app (page context)

import React from "react";
import { render } from "react-dom";
import { computed, observable, toJS, when } from "mobx";
import { observer } from "mobx-react";
import { debounce, isEqual } from "lodash"
import { autobind, cssNames, getHotkey } from "../utils";
import { getManifest, getURL, MenuTranslateFavoritePayload, MenuTranslateVendorPayload, Message, MessageType, onMessage, PlayTextToSpeechPayload, sendMessage } from "../extension";
import { getNextTranslator, getTranslator, ITranslationError, ITranslationResult } from "../vendors";
import ReactShadow from "react-shadow"
import { Icon } from "../components/icon";
import { Popup } from "../components/popup/popup";
import { settingsStore } from "../components/settings/settings.store";
import { themeStore } from "../components/theme-manager/theme.store";
import { userHistoryStore } from "../components/user-history/user-history.store";

const isPdf = document.contentType === "application/pdf";

interface TranslateParams {
  vendor?: string;
  from?: string;
  to?: string;
  text?: string;
}

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
  private pointerElem: HTMLElement;
  private lastReqId: number;

  @observable.ref translation: ITranslationResult;
  @observable.ref error: ITranslationError;
  @observable.ref selectionRects: ClientRect[];
  @observable position: Partial<ClientRect> = {};
  @observable selectedText = "";
  @observable isRtlSelection = false;
  @observable isIconShown = false;

  componentDidMount() {
    document.addEventListener("selectionchange", this.onSelectionChange);
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mouseover", this.onMouseOver);
    document.addEventListener("dblclick", this.onDoubleClick);
    document.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this.onResizeWindow);
    onMessage(this.onMenuClick);
    onMessage(this.onGetSelectedText);
  }

  @computed get iconPosition(): React.CSSProperties {
    var { selectedText, selectionRects, isRtlSelection } = this;
    if (!selectedText || !selectionRects) {
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

  async translate(params?: TranslateParams) {
    var { vendor, langFrom, langTo, autoPlayText, historyEnabled } = this.settings;
    params = Object.assign({
      vendor: vendor,
      from: langFrom,
      to: langTo,
      text: this.selectedText,
    }, params);
    var { vendor, from, to, text } = params;
    if (!text) return;
    try {
      var reqId = Math.random();
      var translator = getTranslator(vendor);
      this.error = null;
      this.lastReqId = reqId;
      var translation = await translator.getTranslation(from, to, text);
      if (reqId === this.lastReqId) {
        this.translation = translation;
        if (autoPlayText) setTimeout(this.playText);
        if (historyEnabled) userHistoryStore.saveTranslation(this.translation);
      }
    } catch (err) {
      this.error = err;
    }
    this.refreshPosition();
  }

  translateNext(reverse = false) {
    if (!this.translation) return;
    var { vendor, langFrom, langTo, originalText } = this.translation;
    var nextTranslator = getNextTranslator(vendor, langFrom, langTo, reverse);
    return this.translate({
      vendor: nextTranslator.name,
      from: langFrom,
      to: langTo,
      text: originalText,
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
    if (!this.translation) return;
    this.translation = null;
    this.error = null;
    this.position = null;
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

  normalizeRect(rect: ClientRect, withScroll = true) {
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

  refreshRects() {
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
        var rect = (focusNode instanceof HTMLElement ? focusNode : range).getBoundingClientRect();
        rects.push(rect);
      }
      this.selectionRects = rects.map(rect => this.normalizeRect(rect));
      this.isRtlSelection = anchorOffset > focusOffset;
    }
    else {
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

  @autobind()
  onSelectionChange() {
    this.selectedText = this.selection.toString().trim();
  }

  @autobind()
  onMouseUp(evt: MouseEvent) {
    if (this.isEditable(document.activeElement) || !this.selectedText) {
      return;
    }
    var { showPopupAfterSelection, showIconNearSelection } = this.settings;
    var target = evt.target as HTMLElement;
    var isOutsidePopup = this.isOutsideOfPopup(target);
    if (isOutsidePopup) {
      this.refreshRects();
    }
    if (showPopupAfterSelection) {
      this.translate();
    }
    else if (showIconNearSelection) {
      var isOutsideIcon = !this.icon.elem.contains(target);
      if (isOutsideIcon && isOutsidePopup) {
        this.showIcon();
      }
    }
  };

  @autobind()
  onMouseDown(evt: MouseEvent) {
    var target = evt.target as HTMLElement;
    var isOutsideIcon = !this.icon.elem.contains(target);
    if (isOutsideIcon) {
      this.selectedText = "";
      this.hideIcon();
    }
    if (this.isOutsideOfPopup(target)) {
      this.hidePopup();
    }
  }

  @autobind()
  onMouseOver(evt: MouseEvent) {
    this.pointerElem = evt.target as HTMLElement; // keep element for keydown event
  }

  @autobind()
  onIconClick(evt: React.MouseEvent) {
    evt.nativeEvent.stopImmediatePropagation(); // don't reset text selection
    this.hideIcon();
    this.translate();
  }

  // run with delay after `selectionchange` and get latest then `this.selectedText` in callback
  onDoubleClick = debounce((evt: MouseEvent) => {
    var { showPopupAfterSelection, showPopupOnDoubleClick } = this.settings;
    if (showPopupAfterSelection || this.isEditable(evt.target as HTMLElement)) {
      return;
    }
    if (showPopupOnDoubleClick && this.selectedText) {
      this.hideIcon();
      this.refreshRects();
      this.translate();
    }
  }, 500);

  @autobind()
  onMenuClick(message: Message) {
    var { type } = message;
    if (type === MessageType.MENU_TRANSLATE_WITH_VENDOR) {
      let { vendor, selectedText } = message.payload as MenuTranslateVendorPayload;
      this.translate({ vendor, text: selectedText });
    }
    if (type === MessageType.MENU_TRANSLATE_FAVORITE) {
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
    var popupIsVisible = !!(this.translation || this.error);
    if (popupIsVisible) {
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
    if (isEqual(currentHotkey, hotkey)) {
      var text = this.selectedText;
      var elem = this.pointerElem;
      var notRoot = elem !== document.documentElement && elem !== document.body;
      var obtainText = !text && elem && notRoot && this.isOutsideOfPopup(elem);
      if (obtainText) {
        this.selection.collapse(elem, 0);

        // detect and select text nodes from element under mouse cursor
        var textNode: Node, textNodes: Node[] = [];
        var searchTextNodes = document.evaluate('.//text()', elem, null, XPathResult.ANY_TYPE, null);
        while ((textNode = searchTextNodes.iterateNext())) {
          textNodes.push(textNode);
        }
        if (textNodes.length) {
          var lastNode = textNodes.slice(-1)[0];
          this.selection.extend(lastNode, lastNode.textContent.length);
          this.onSelectionChange();
          text = this.selectedText;
        }
        // if still no text try to get some information from input fields or images
        if (!text) {
          if (elem instanceof HTMLInputElement || elem instanceof HTMLTextAreaElement) {
            text = elem.value || elem.placeholder;
          }
          if (elem instanceof HTMLImageElement) {
            text = elem.title || elem.alt;
          }
        }
      }
      if (text) {
        this.refreshRects();
        this.translate({ text });
        evt.preventDefault();
      }
    }
  }

  onResizeWindow = debounce(() => {
    if (this.selectedText) this.refreshRects();
    this.refreshPosition();
  }, 250)

  render() {
    var { translation, error, playText, translateNext, isIconShown, position, onIconClick } = this;
    var { langFrom, langTo } = this.settings;
    return (
      <>
        <ReactShadow include={[this.style]}>
          <div className="popup-host">
            <Popup
              className={cssNames({ showInPdf: isPdf })}
              style={position}
              translation={translation} error={error}
              onPlayText={playText}
              onTranslateNext={() => translateNext()}
              ref={e => this.popup = e}
            />
          </div>
        </ReactShadow>
        <Icon
          material="explore"
          style={this.iconPosition}
          hidden={!isIconShown}
          onMouseDown={onIconClick}
          title={`${this.appName}: ${[langFrom, langTo].join(' → ').toUpperCase()}`}
          ref={e => this.icon = e}
        />
      </>
    )
  }
}

// init
App.init();
