// User script (content page)

require('./user-script.scss');
import * as React from 'react';
import { autobind, debounce } from "core-decorators";
import { render } from 'react-dom'
import { isProduction } from '../env'
import { connect, onMessage, MessageType, Message, getURL } from '../extension'
import { MenuTranslateFavoritePayload, MenuTranslateVendorPayload } from '../extension'
import { AppState } from '../store/store.types'
import { Popup } from "../components/popup/popup";
import { vendors, Translation, TranslationError, getNextVendor } from "../vendors";
import { getHotkey } from "../utils/parseHotkey";
const ReactShadow = require("react-shadow").default;
import isEqual = require("lodash/isEqual");

interface State {
  translation?: Translation
  error?: TranslationError
  range?: Range
  position?: Position
  customFont?: string
  adsInjected?: boolean
}

interface Position {
  left?: number
  top?: number
  right?: number
  bottom?: number
}

class App extends React.Component<AppState, State> {
  public state: State = {};
  private style = getURL('injector.css');
  private pointerElem: Element;
  private icon: HTMLElement;
  private iconShown: boolean;
  private selection = window.getSelection();
  private translation: Promise<Translation>;
  private popup: Popup;

  get settings() {
    return this.props.settings;
  }

  get theme() {
    return this.props.theme;
  }

  get text() {
    return this.selection.toString().trim();
  }

  get range() {
    return this.selection.getRangeAt(0);
  }

  get popupHost() {
    return placeholder.querySelector('.popup-content') as HTMLElement;
  }

  get isFocused() {
    return document.activeElement === this.popupHost;
  }

  bindEvents() {
    document.addEventListener("mouseover", this.onMouseOver);
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("dblclick", this.onDoubleClick);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("selectionchange", this.onSelectionChange);
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
    if (!s.rangeCount || !this.text) return;
    var focusOffset = s.focusOffset;
    var anchorOffset = s.anchorOffset;

    if (s.anchorNode !== s.focusNode) {
      var commonAncestorText = this.range.commonAncestorContainer.textContent;
      anchorOffset = commonAncestorText.indexOf(s.anchorNode.textContent);
      focusOffset = commonAncestorText.indexOf(s.focusNode.textContent);
    }

    var clientRects = Array.from(this.range.getClientRects());
    if (clientRects.length) {
      var rect = this.normalizeRect(anchorOffset < focusOffset ? clientRects.pop() : clientRects.shift());
      var isLeftTop = anchorOffset > focusOffset;
      this.icon.classList.toggle('isLeftTop', isLeftTop);
      this.icon.style.left = (isLeftTop ? rect.left : rect.right) + "px";
      this.icon.style.top = (isLeftTop ? rect.top : rect.bottom) + "px";
      document.body.appendChild(this.icon);
      this.iconShown = true;
    }
  }

  hideIcon() {
    if (!this.iconShown) return;
    this.iconShown = false;
    this.icon.parentNode.removeChild(this.icon);
  }

  normalizeRect(rect: ClientRect): ClientRect {
    var left = rect.left + window.pageXOffset;
    var top = rect.top + window.pageYOffset;
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
    var canRotateVendor = this.isFocused && !e.shiftKey;
    switch (e.keyCode) {
      case 27: // Escape
        this.hidePopup();
        break;
      case 37: // ArrowLeft
        if (canRotateVendor) this.translateWithNextVendor(true);
        break;
      case 39: // ArrowRight
        if (canRotateVendor) this.translateWithNextVendor();
        break;
    }
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
      this.translate(text);
    }
  }

  @autobind()
  onDoubleClick(e: MouseEvent) {
    this.hideIcon();
    if (this.settings.showPopupAfterSelection) return;
    if (!this.settings.showPopupOnDoubleClick || !this.text) return;
    this.translate();
  }

  @autobind()
  onMouseDown(e: MouseEvent) {
    this.hideIcon();
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
      if (target instanceof HTMLInputElement) return;
      if (target instanceof HTMLTextAreaElement) return;
      if (target.isContentEditable) return;
      return this.translateLazy();
    }
    if (this.settings.showIconNearSelection) {
      if (this.isOutsideOfPopup(target)) this.showIcon();
    }
  }

  isOutsideOfPopup(elem) {
    return !this.popupHost.contains(elem);
  }

  translate(text = this.text) {
    if (!text) return;
    var { vendor, langFrom, langTo } = this.settings;
    var vendorApi = vendors[vendor];
    var translation = vendorApi.getTranslation(langFrom, langTo, text);
    this.handleTranslation(translation);
  }

  translateWithVendor(vendor: string, from = this.settings.langFrom, to = this.settings.langTo) {
    var text = this.text;
    var vendorApi = vendors[vendor];
    if (text && vendorApi) {
      var translation = vendorApi.getTranslation(from, to, text);
      this.handleTranslation(translation);
    }
  }

  translateWithNextVendor(reverse = false) {
    var vendor = this.state.translation.vendor;
    var { langFrom, langTo } = this.settings;
    var vendorApi = getNextVendor(vendor, langFrom, langTo, reverse);
    if (vendorApi) {
      var lastRange = this.state.range;
      if (lastRange) {
        this.selection.removeAllRanges();
        this.selection.addRange(lastRange);
      }
      this.translateWithVendor(vendorApi.name, langFrom, langTo);
    }
  }

  handleTranslation(translation: Promise<Translation>) {
    var range = this.range;
    var promise = this.translation = translation.then(result => {
      this.hideIcon();
      if (this.translation !== promise) return;
      var state: State = {
        translation: result,
        error: null,
        range: range,
        position: this.getPosition(this.getRect(range))
      };
      this.setState(state, this.onTranslationReady);
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

  getRect(range = this.state.range) {
    var endContainer = range.endContainer as Element;
    if (!range.getClientRects().length) return this.normalizeRect(endContainer.getBoundingClientRect());
    return this.normalizeRect(range.getBoundingClientRect());
  }

  getPosition(rect = this.getRect()): Position {
    return {
      left: rect.left,
      top: rect.bottom,
    };
  }

  refinePosition() {
    var viewPort = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
    var changePosition = false;
    var selectionRect = this.getRect();
    var popupRect = this.popup.elem.getBoundingClientRect();
    var position = this.getPosition(selectionRect);

    if (popupRect.right > viewPort.width) {
      changePosition = true;
      delete position.left;
      position.right = viewPort.width - selectionRect.right;
    }
    if (popupRect.bottom > viewPort.height) {
      var margin = parseInt(window.getComputedStyle(this.popup.elem).marginTop) * 2;
      changePosition = true;
      position.top = selectionRect.top - popupRect.height - margin;
    }
    if (changePosition) {
      this.setState({ position: position });
    }
  }

  @debounce(250)
  translateLazy() {
    this.translate();
  }

  loadWebFont(fontFamily: string) {
    if (this.state.customFont !== fontFamily) {
      this.setState({ customFont: fontFamily });
      Popup.loadWebFont(fontFamily);
    }
  }

  injectAds(allowed: boolean) {
    if (allowed && isProduction && !this.state.adsInjected) {
      this.setState({ adsInjected: true });
      require('./context-ads');
    }
  }

  componentWillMount() {
    this.initIcon();
    this.bindEvents();
    this.loadWebFont(this.theme.fontFamily);
    this.injectAds(this.settings.allowAds);
  }

  componentWillReceiveProps(nextProps: AppState) {
    this.loadWebFont(nextProps.theme.fontFamily);
    this.injectAds(nextProps.settings.allowAds);
  }

  hidePopup() {
    if (this.isHidden) return;
    var range = this.state.range;
    if (range) range.detach();
    this.setState({ translation: null, error: null, range: null });
    if (this.text) this.selection.removeAllRanges();
  }

  get isHidden() {
    var { translation, error } = this.state;
    return !translation && !error;
  }

  render() {
    var { translation, error, position } = this.state;
    return (
        <ReactShadow include={[this.style]}>
          <div className="popup-content">
            <Popup translation={translation} error={error} position={position}
                   theme={this.theme} showPlayIcon={this.settings.showPlayIcon}
                   ref={e => this.popup = e}/>
          </div>
        </ReactShadow>
    )
  }
}

var app: App;
const renderApp = (state: AppState) => render(<App {...state} ref={e => app = e}/>, placeholder);

// create placeholder to render app
var placeholder = document.createElement('div');
placeholder.className = "XTranslate";
document.body.appendChild(placeholder);

// connect to background process and get current app state
const port = connect();
port.onMessage.addListener(function (message: Message) {
  switch (message.type) {
    case MessageType.APP_STATE:
      renderApp(message.payload);
      break;
  }
});

// update app state and handle menu clicks from options page messages
onMessage(function (message) {
  var { type } = message;
  if (type === MessageType.APP_STATE_SYNC) {
    renderApp(message.payload);
  }
  if (type === MessageType.MENU_TRANSLATE_VENDOR) {
    let payload = message.payload as MenuTranslateVendorPayload;
    app.translateWithVendor(payload.vendor);
  }
  if (type === MessageType.MENU_TRANSLATE_FAVORITE) {
    let payload = message.payload as MenuTranslateFavoritePayload;
    app.translateWithVendor(payload.vendor, payload.from, payload.to);
  }
});