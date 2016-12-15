// User script (content page)

require('./user-script.scss');
import * as React from 'react';
import { autobind, debounce } from "core-decorators";
import { render } from 'react-dom'
import { connect, onMessage, MessageType, Message, getURL, getManifest, postMessage, onPostMessage } from '../extension'
import { MenuTranslateFavoritePayload, MenuTranslateVendorPayload, TranslateFromFramePayload } from '../extension'
import { loadFonts } from "../components/theme-manager/fonts-loader";
import { AppState } from '../store/store.types'
import { Popup } from "../components/popup/popup";
import { vendors, Translation, TranslationError, getNextVendor } from "../vendors";
import { getHotkey } from "../utils/parseHotkey";
const ReactShadow = require("react-shadow").default;
import isEqual = require("lodash/isEqual");
const logo = require("../components/app/logo.gif");
const topWindow = window.top;
const isFrameWindow = window !== topWindow;

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
  private translation: Promise<Translation>;
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

  get popupHost() {
    return appContainer.querySelector('.popup-content') as HTMLElement;
  }

  get isFocused() {
    return document.activeElement === this.popupHost;
  }

  componentWillMount() {
    this.port.onMessage.addListener(this.onAppState);
  }

  bindEvents() {
    onMessage(this.onAppState);
    onMessage(this.onMenuClick);
    onPostMessage(this.onPostMessage);
    document.addEventListener("mouseover", this.onMouseOver);
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("dblclick", this.onDoubleClick);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("selectionchange", this.onSelectionChange);
    window.addEventListener("resize", this.onWindowResize);
  }

  @autobind()
  onAppState(message: Message) {
    if (message.type === MessageType.APP_STATE) {
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
      let payload = message.payload as MenuTranslateVendorPayload;
      this.translateWith(payload.vendor);
    }
    if (type === MessageType.MENU_TRANSLATE_FAVORITE) {
      let payload = message.payload as MenuTranslateFavoritePayload;
      this.translateWith(payload.vendor, payload.from, payload.to);
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

  normalizeRect(rect: ClientRect, withScroll = true) {
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
  @debounce(50)
  onWindowResize(e) {
    if (this.isHidden) return;
    this.refreshPosition();
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
  onKeydownWithinPopup(e: React.KeyboardEvent<any>) {
    var canRotateVendor = this.isFocused && !e.shiftKey;
    switch (e.keyCode) {
      case 27: // Escape
        this.hidePopup();
        e.stopPropagation();
        break;
      case 37: // ArrowLeft
        if (canRotateVendor) {
          this.translateWithNextVendor(true);
          e.preventDefault();
        }
        break;
      case 39: // ArrowRight
        if (canRotateVendor) {
          this.translateWithNextVendor();
          e.preventDefault();
        }
        break;
    }
  }

  @autobind()
  onKeyDown(e: KeyboardEvent) {
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
    if (isFrameWindow) this.hidePopupFromFrame();
    if (!this.isHidden) {
      var target = e.toElement;
      if (!this.icon.contains(target) && this.isOutsideOfPopup(target)) {
        this.hidePopup();
      }
    }
  }

  @autobind()
  onMouseUp(e: MouseEvent) {
    var target = e.toElement as HTMLElement;
    if (this.settings.showPopupAfterSelection && this.text) {
      if (this.isEditable(target)) return;
      return this.translateLazy();
    }
    if (this.settings.showIconNearSelection) {
      if (this.isOutsideOfPopup(target)) this.showIcon();
    }
  }

  isEditable(elem: HTMLElement) {
    return elem instanceof HTMLInputElement
        || elem instanceof HTMLTextAreaElement
        || elem.isContentEditable;
  }

  isOutsideOfPopup(elem) {
    return !this.popupHost.contains(elem);
  }

  translate(text = this.text) {
    var { vendor, langFrom, langTo } = this.settings;
    this.translateWith(vendor, langFrom, langTo, text);
  }

  translateWith(vendorName: string, from = this.settings.langFrom, to = this.settings.langTo, text = this.text, rect?: ClientRect) {
    var vendorApi = vendors[vendorName];
    if (text && text.length <= vendorApi.maxTextInputLength) {
      if (isFrameWindow) {
        postMessage({
          type: MessageType.TRANSLATE_FROM_FRAME,
          payload: {
            translate: [vendorName, from, to, text],
            rect: this.getFrameRect()
          } as TranslateFromFramePayload
        });
      } else {
        var translation = vendorApi.getTranslation(from, to, text);
        this.handleTranslation(translation, rect);
      }
    }
  }

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
    var autoPlay = this.settings.autoPlayText;
    if (autoPlay) this.popup.playText();
    this.refinePosition();
    this.popup.focus();
  }

  getRect(range = this.range) {
    var endContainer = range.endContainer as Element;
    if (!range.getClientRects().length) return this.normalizeRect(endContainer.getBoundingClientRect());
    return this.normalizeRect(range.getBoundingClientRect());
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
  refreshPosition() {
    var position = this.getPosition();
    this.setState({ position }, this.refinePosition);
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

  @debounce(250)
  translateLazy() {
    this.translate();
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

  get isHidden() {
    var { translation, error } = this.state;
    return !translation && !error;
  }

  render() {
    var { translation, error, position } = this.state;
    if (!this.state.appState) return null;
    return (
        <ReactShadow include={[this.style]}>
          <div className="popup-content" onKeyDown={this.onKeydownWithinPopup}>
            <Popup translation={translation} error={error} position={position}
                   theme={this.theme} showPlayIcon={this.settings.showPlayIcon}
                   ref={e => this.popup = e}/>
          </div>
        </ReactShadow>
    )
  }
}

// init app
const appContainer = document.createElement("div");
appContainer.className = "XTranslate";
document.body.appendChild(appContainer);
render(<App/>, appContainer);