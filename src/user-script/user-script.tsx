// User script (content page)

import "./user-script.scss";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { autobind } from "core-decorators";
import { connect, getManifest, getURL, MenuTranslateFavoritePayload, MenuTranslateVendorPayload, Message, MessageType, onMessage, onPostMessage, postMessage, sendMessage, TranslateFromFramePayload } from "../extension";
import { saveHistory } from "../components/user-history/user-history.actions";
import { loadFonts } from "../components/theme-manager/fonts-loader";
import { AppState } from "../store/store.types";
import { Popup } from "../components/popup/popup";
import { getNextVendor, Translation, TranslationError, vendors } from "../vendors";
import { cssNames } from "../utils/cssNames";
import { getHotkey } from "../utils/parseHotkey";
import isEqual = require("lodash/isEqual");

const ReactShadow = require("react-shadow").default;
const topWindow = window.top;
const isFrameWindow = window !== topWindow;
const isPdf = document['contentType'] === "application/pdf";

interface State {
  appState?: AppState
  translation?: Translation
  error?: TranslationError
  rect?: ClientRect
  position?: Position
  customFont?: string
}

interface Position {
  left?: number
  top?: number
  right?: number
  bottom?: number
}

class App extends React.Component<{}, State> {
  public appName = getManifest().name;
  public state: State = {};
  private port = connect();
  private style = getURL('injector.css');
  private pointerElem: Element;
  private icon: HTMLElement;
  private iconShown: boolean;
  private selection = window.getSelection();
  private translation: Promise<any>;
  private popup: Popup;

  get settings() {
    return this.state.appState.settings;
  }

  get theme() {
    return this.state.appState.theme;
  }

  get text() {
    return this.selection.toString().trim();
  }

  get range() {
    return this.selection.getRangeAt(0);
  }

  get isHidden() {
    var { translation, error } = this.state;
    return !translation && !error;
  }

  componentWillMount() {
    this.port.onMessage.addListener(this.onAppState);
  }

  bindEvents() {
    onMessage(this.onAppState);
    onMessage(this.onMenuClick);
    onMessage(this.onGetSelectedText);
    onPostMessage(this.onPostMessage);
    document.addEventListener("mouseover", this.onMouseOver);
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("dblclick", this.onDoubleClick);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("selectionchange", this.onSelectionChange);
  }

  @autobind()
  onAppState(message: Message) {
    var type = message.type;
    if (type === MessageType.APP_STATE) {
      var init = !this.state.appState;
      this.setState({ appState: message.payload }, () => {
        if (init) {
          this.initIcon();
          this.bindEvents();
        }
      });
    }
  }

  @autobind()
  onMenuClick(message: Message) {
    var { type } = message;
    if (type === MessageType.MENU_TRANSLATE_WITH_VENDOR) {
      let { vendor, selectedText } = message.payload as MenuTranslateVendorPayload;
      this.translateWith(vendor, null, null, selectedText);
    }
    if (type === MessageType.MENU_TRANSLATE_FAVORITE) {
      let { vendor, from, to, selectedText } = message.payload as MenuTranslateFavoritePayload;
      this.translateWith(vendor, from, to, selectedText);
    }
  }

  @autobind()
  onGetSelectedText(message: Message) {
    if (this.text && message.type === MessageType.GET_SELECTED_TEXT) {
      sendMessage({
        type: MessageType.SELECTED_TEXT,
        payload: this.text
      })
    }
  }

  @autobind()
  onPostMessage(message: Message) {
    if (isFrameWindow) return;
    if (message.type === MessageType.TRANSLATE_FROM_FRAME) {
      var { rect, translate } = message.payload as TranslateFromFramePayload;
      var [vendor, from, to, text] = translate;
      rect = this.normalizeRect(rect);
      this.translateWith(vendor, from, to, text, rect);
    }
    if (message.type === MessageType.HIDE_POPUP_FROM_FRAME) {
      this.hidePopup();
    }
  }

  initIcon() {
    this.icon = document.createElement("i");
    this.icon.className = "XTranslate-icon material-icons";
    this.icon.onmousedown = (e) => {
      this.hideIcon();
      this.translate();
      e.preventDefault(); // don't reset text selection
      e.stopPropagation(); // don't show icon again on mouseup
    };
  }

  showIcon() {
    var s = this.selection;
    var text = this.text;
    var vendor = vendors[this.settings.vendor];
    if (!s.rangeCount || !text || text.length > vendor.maxTextInputLength) return;
    var focusOffset = s.focusOffset;
    var anchorOffset = s.anchorOffset;

    if (s.anchorNode !== s.focusNode) {
      var commonAncestorText = this.range.commonAncestorContainer.textContent;
      anchorOffset = commonAncestorText.indexOf(s.anchorNode.textContent);
      focusOffset = commonAncestorText.indexOf(s.focusNode.textContent);
    }

    var clientRects = Array.from(this.range.getClientRects());
    if (clientRects.length) {
      var { langFrom, langTo } = this.settings;
      var rect = this.normalizeRect(anchorOffset < focusOffset ? clientRects.pop() : clientRects.shift());
      var isLeftTop = anchorOffset > focusOffset;
      this.icon.classList.toggle('isLeftTop', isLeftTop);
      this.icon.style.left = (isLeftTop ? rect.left : rect.right) + "px";
      this.icon.style.top = (isLeftTop ? rect.top : rect.bottom) + "px";
      this.icon.title = `${this.appName} (${[langFrom, langTo].join(' → ').toUpperCase()})`;
      appContainer.appendChild(this.icon);
      this.iconShown = true;
    }
  }

  hideIcon() {
    if (!this.iconShown) return;
    this.iconShown = false;
    this.icon.parentNode.removeChild(this.icon);
  }

  normalizeRect(rect = { left: 0, top: 0, width: 0, height: 0 }, withScroll = true) {
    var left = rect.left + (withScroll ? window.pageXOffset : 0);
    var top = rect.top + (withScroll ? window.pageYOffset : 0);
    var width = rect.width;
    var height = rect.height;
    return {
      left, top, width, height,
      right: left + width,
      bottom: top + height,
    };
  }

  @autobind()
  onSelectionChange() {
    if (!this.text) this.hideIcon();
  }

  @autobind()
  onMouseOver(e: MouseEvent) {
    this.pointerElem = e.toElement;
  }

  @autobind()
  onKeyDown(e: KeyboardEvent) {
    // hiding popup, getting prev-next vendor translation
    if (!this.isHidden) {
      switch (e.keyCode) {
        case 27: // Escape
          this.hidePopup();
          e.stopPropagation();
          break;
        case 37: // ArrowLeft
          this.translateWithNextVendor(true);
          e.preventDefault();
          break;
        case 39: // ArrowRight
          this.translateWithNextVendor();
          e.preventDefault();
          break;
      }
    }
    // handle text translation by hotkey
    if (!this.settings.showPopupOnHotkey) return;
    var hotkey = getHotkey(e);
    if (isEqual(this.settings.hotkey, hotkey)) {
      var text = this.text;
      var elem = this.pointerElem;
      var notRoot = elem !== document.documentElement && elem !== document.body;
      var canAllocateText = elem && notRoot && this.isOutsideOfPopup(elem);

      if (!text && canAllocateText) {
        this.selection.collapse(elem, 0);

        // detect and select text nodes from element under mouse cursor
        var textNode: Node, textNodes: Node[] = [];
        var searchTextNodes = document.evaluate('.//text()', elem, null, XPathResult.ANY_TYPE, null);
        while (textNode = searchTextNodes.iterateNext()) {
          textNodes.push(textNode);
        }
        if (textNodes.length) {
          var lastNode = textNodes.slice(-1)[0];
          this.selection.extend(lastNode, lastNode.textContent.length);
          text = this.text;
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
        this.translate(text);
        e.preventDefault();
      }
    }
  }

  @autobind()
  onDoubleClick(e: MouseEvent) {
    if (this.isEditable(e.toElement as HTMLElement)) return;
    if (this.settings.showPopupAfterSelection) return;
    if (!this.settings.showPopupOnDoubleClick || !this.text) return;
    this.hideIcon();
    this.translate();
  }

  @autobind()
  onMouseDown(e: MouseEvent) {
    this.hideIcon();
    var rightButton = e.button === 2;
    if (isFrameWindow) this.hidePopupFromFrame();
    if (!this.isHidden && !rightButton) {
      var target = e.toElement;
      if (!this.icon.contains(target) && this.isOutsideOfPopup(target)) {
        this.hidePopup();
      }
    }
  }

  @autobind()
  onMouseUp(e: MouseEvent) {
    if (this.isEditable(document.activeElement)) return;
    if (this.settings.showPopupAfterSelection && this.text) {
      return this.translate();
    }
    if (this.settings.showIconNearSelection) {
      if (this.isOutsideOfPopup(e.toElement)) this.showIcon();
    }
  }

  isEditable(elem: Element) {
    return elem instanceof HTMLInputElement
      || elem instanceof HTMLTextAreaElement
      || (elem as HTMLElement).isContentEditable;
  }

  isOutsideOfPopup(elem) {
    var popupHost = appContainer.querySelector('.popup-content');
    return !popupHost.contains(elem);
  }

  translate(text = this.text) {
    var { vendor, langFrom, langTo } = this.settings;
    this.translateWith(vendor, langFrom, langTo, text);
  }

  translateWith(vendorName: string, langFrom?, langTo?, text = this.text, rect?: ClientRect) {
    langFrom = langFrom || this.settings.langFrom;
    langTo = langTo || this.settings.langTo;
    var vendorApi = vendors[vendorName];
    if (text && text.length <= vendorApi.maxTextInputLength) {
      if (isFrameWindow) {
        postMessage({
          type: MessageType.TRANSLATE_FROM_FRAME,
          payload: {
            translate: [vendorName, langFrom, langTo, text],
            rect: this.getFrameRect()
          } as TranslateFromFramePayload
        });
      } else {
        var translation = vendorApi.getTranslation(langFrom, langTo, text);
        this.handleTranslation(translation, rect);
      }
    }
  }

  @autobind()
  translateWithNextVendor(reverse = false) {
    var { langFrom, langTo } = this.settings;
    var { rect, translation } = this.state;
    var { vendor, originalText } = translation;
    var vendorApi = getNextVendor(vendor, langFrom, langTo, reverse);
    if (vendorApi) {
      this.translateWith(vendorApi.name, langFrom, langTo, originalText, rect);
    }
  }

  handleTranslation(translation: Promise<Translation>, rect = this.getRect()) {
    var promise = this.translation = translation.then(result => {
      this.hideIcon();
      if (this.translation !== promise) return;
      var state: State = {
        translation: result,
        error: null,
        rect: rect,
        position: this.getPosition(rect)
      };
      this.setState(state, this.onTranslationReady);
      return result;
    }).catch(error => {
      if (this.translation !== promise) return;
      this.setState({
        translation: null,
        error: error
      });
    });
  }

  @autobind()
  onTranslationReady() {
    var { autoPlayText, historyEnabled } = this.settings;
    if (autoPlayText) this.popup.playText();
    if (historyEnabled) saveHistory(this.state.translation, this.settings);
    this.refinePosition();
    // this.popup.focus(); // fix: copy-paste not working when shadow-dom element or its descendants is focused
  }

  getRect(range?: Range) {
    try {
      range = range || this.range;
      var endContainer = range.endContainer as Element;
      if (!range.getClientRects().length) return this.normalizeRect(endContainer.getBoundingClientRect());
      return this.normalizeRect(range.getBoundingClientRect());
    } catch (e) {
      return this.normalizeRect();
    }
  }

  getPosition(rect = this.state.rect): Position {
    return {
      left: rect.left,
      top: rect.bottom,
    };
  }

  getFrameRect() {
    var frameRects = [];
    var win = window;
    while (win !== win.parent) {
      var parentWindow = win.parent;
      var frameElem = win.frameElement;
      if (frameElem) frameRects.unshift(frameElem.getBoundingClientRect());
      win = parentWindow;
    }

    var rect = this.normalizeRect(this.range.getBoundingClientRect(), false);
    rect.left = Math.max(0, rect.left);
    rect.top = Math.max(0, rect.top);
    rect.width = Math.min(window.innerWidth, rect.width);
    rect.height = Math.min(window.innerHeight, rect.height);
    frameRects.forEach(r => {
      rect.left += r.left;
      rect.top += r.top;
    });
    return rect;
  }

  @autobind()
  refinePosition() {
    var { rect, position } = this.state;
    if (!rect) return;
    var changePosition = false;
    var popupRect = this.popup.elem.getBoundingClientRect();
    var viewPort = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };

    if (popupRect.right > viewPort.width) {
      changePosition = true;
      delete position.left;
      position.right = viewPort.width - rect.right;
    }
    if (popupRect.bottom > viewPort.height) {
      var margin = parseInt(window.getComputedStyle(this.popup.elem).marginTop) * 2;
      changePosition = true;
      position.top = rect.top - popupRect.height - margin;
    }
    if (changePosition) {
      this.setState({ position: position });
    }
  }

  componentWillUpdate(nextProps, { appState }: State) {
    if (!appState || this.state.appState === appState) return;
    var fontFamily = appState.theme.fontFamily;
    if (this.state.customFont !== fontFamily) {
      loadFonts(fontFamily);
      this.setState({ customFont: fontFamily });
    }
  }

  hidePopup() {
    if (this.isHidden) return;
    this.setState({ translation: null, error: null, rect: null });
    if (this.text) this.selection.removeAllRanges();
  }

  hidePopupFromFrame() {
    postMessage({ type: MessageType.HIDE_POPUP_FROM_FRAME });
  }

  render() {
    var { translation, error, position } = this.state;
    if (!this.state.appState) return null;
    return (
      <ReactShadow include={[this.style]}>
        <div className="popup-content">
          <Popup className={cssNames({ pdf: isPdf })}
                 translation={translation} error={error} position={position}
                 theme={this.theme} settings={this.settings}
                 next={this.translateWithNextVendor}
                 ref={e => this.popup = e}/>
        </div>
      </ReactShadow>
    )
  }
}

// init app
const appContainer = document.createElement("div");
appContainer.className = "XTranslate";
document.documentElement.appendChild(appContainer);
ReactDOM.render(<App/>, appContainer);