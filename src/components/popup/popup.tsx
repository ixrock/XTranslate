import "./popup.scss";

import * as React from "react";
import { autobind } from "core-decorators";
import { __i18n } from "../../extension/i18n";
import { MessageType } from "../../extension/message";
import { sendMessage } from "../../extension/runtime";
import { cssNames } from "../../utils/cssNames";
import { cssColor } from "../ui/color-picker/cssColor";
import { MaterialIcon } from "../ui/icons/material-icon";
import { IThemeManagerState } from "../theme-manager/theme-manager.types";
import { ISettingsState } from "../settings/settings.types";
import { fontsList, loadFonts } from "../theme-manager/fonts-loader";
import { getNextVendor, getVendor, Translation, TranslationError } from "../../vendors";

interface Props extends React.HTMLProps<any> {
  preview?: boolean;
  className?: any
  settings?: ISettingsState
  theme?: IThemeManagerState
  translation?: Translation
  error?: TranslationError
  position?: React.CSSProperties
  next?: () => void;
}

interface State {
  cssThemeStyle?: React.CSSProperties
  boxSizeStyle?: React.CSSProperties
}

export class Popup extends React.Component<Props, State> {
  public elem: HTMLElement;
  public state: State = {};

  componentWillMount() {
    this.applyTheme();
  }

  componentWillReceiveProps(nextProps: Props) {
    this.stopPlaying();
    if (this.props.theme !== nextProps.theme) {
      this.applyTheme(nextProps.theme);
    }
  }

  @autobind()
  focus() {
    this.elem.focus();
  }

  applyTheme(theme = this.props.theme) {
    if (!theme) return;
    loadFonts(theme.fontFamily);
    var font = fontsList.filter(font => font.font === theme.fontFamily)[0];
    var cssTheme = {
      background: cssColor(theme.bgcMain),
      borderRadius: theme.borderRadius,
      fontFamily: [JSON.stringify(theme.fontFamily)].concat(font.family ? font.family : []).join(", "),
      fontSize: theme.fontSize,
      color: cssColor(theme.textColor),
      border: theme.borderWidth ? [
        theme.borderWidth + "px",
        theme.borderStyle,
        cssColor(theme.borderColor)
      ].join(" ") : "",
      textShadow: (theme.textShadowRadius || theme.textShadowOffsetX || theme.textShadowOffsetY) ? [
        theme.textShadowOffsetX + "px",
        theme.textShadowOffsetY + "px",
        theme.textShadowRadius + "px",
        cssColor(theme.textShadowColor)
      ].join(" ") : "",
      boxShadow: theme.boxShadowBlur ? [
        theme.boxShadowInner ? "inset" : "",
        0, 0, theme.boxShadowBlur + "px",
        cssColor(theme.boxShadowColor)
      ].join(" ") : ""
    };
    if (theme.bgcLinear) {
      cssTheme.background = `linear-gradient(180deg, ${cssTheme.background}, ${cssColor(theme.bgcSecondary)})`;
    }
    var { maxHeight, maxWidth, minHeight, minWidth } = theme;
    var boxSize = {
      maxWidth: !maxWidth ? "" : Math.max(maxWidth, minWidth),
      maxHeight: !maxHeight ? "" : Math.max(maxHeight, minHeight),
      minWidth: minWidth,
      minHeight: minHeight,
    };
    this.setState({
      cssThemeStyle: cssTheme,
      boxSizeStyle: boxSize
    });
  }

  @autobind()
  playText() {
    var { langDetected, langFrom, originalText, vendor } = this.props.translation;
    sendMessage({
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
    var translation = this.props.translation;
    if (translation) {
      sendMessage({
        type: MessageType.STOP_TTS_PLAYING,
        payload: translation.vendor
      });
    }
  }

  @autobind()
  translateNextVendor() {
    if (this.props.next) {
      this.props.next();
    }
  }

  @autobind()
  copyToClipboard() {
    window.getSelection().selectAllChildren(this.elem);
    document.execCommand("copy");
  }

  renderResult() {
    const result = this.props.translation;
    if (!result) return null;
    const { translation, transcription, dictionary, vendor, langFrom, langTo, langDetected } = result;
    const { showTextToSpeechIcon, showNextVendorIcon, showCopyTranslationIcon } = this.props.settings;
    const boxSizeStyle = this.state.boxSizeStyle;
    const vendorApi = getVendor(vendor);
    const rtlClass = { rtl: vendorApi.isRightToLeft(langTo) };
    const title = __i18n("translated_with", [
      vendorApi.title, `${langDetected || langFrom} → ${langTo}`.toUpperCase()
    ]).join("");
    var nextVendorIcon = null;
    if (showNextVendorIcon) {
      let nextVendor = getNextVendor(vendor, langFrom, langTo);
      let iconTitle = __i18n("popup_next_vendor_icon_title", [nextVendor.title]).join("");
      nextVendorIcon = <MaterialIcon name="arrow_forward" onClick={this.translateNextVendor} title={iconTitle}/>
    }
    return (
      <div className="translation-result" style={boxSizeStyle}>
        <div className="translation flex gaps">
          {showTextToSpeechIcon ? (
            <MaterialIcon
              name="play_circle_outline"
              title={__i18n("popup_play_icon_title")}
              onClick={this.playText}/>
          ) : null}
          <div className={cssNames("value box grow", rtlClass)} title={title}>
            <span>{translation}</span>
            {transcription ? <i className="transcription">{" "}[{transcription}]</i> : null}
          </div>
          <div className="icons">
            {showCopyTranslationIcon && (
              <MaterialIcon
                name="content_copy"
                title={__i18n("popup_copy_translation_title")}
                onClick={this.copyToClipboard}
              />
            )}
            {nextVendorIcon}
          </div>
        </div>
        {dictionary.map(({ wordType, meanings }, i) =>
          <div key={wordType} className={cssNames("dictionary", rtlClass)}>
            <div className="word-type">{wordType}</div>
            <div className="word-meanings">
              {meanings.map((meaning, i, list) => {
                var last = i === list.length - 1;
                var title = meaning.translation.join(", ") || null;
                return [
                  <span key={i} className="word" title={title}>{meaning.word}</span>,
                  !last ? ", " : null
                ]
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  renderError() {
    if (!this.props.error) return null;
    var { status, statusText } = this.props.error;
    return (
      <div className="translation-error">
        {status} - {statusText}
      </div>
    )
  }

  render() {
    var { translation, error, position, className, preview, settings } = this.props;
    var { popupFixedPos } = settings;
    var { cssThemeStyle } = this.state;
    var style = Object.assign({}, cssThemeStyle, !popupFixedPos ? position : {});
    var visible = translation || error;
    var popupClass = cssNames("Popup", className, {
      visible, preview,
      ["fixedPos " + popupFixedPos]: popupFixedPos && !preview
    });
    return (
      <div className={popupClass} style={style} tabIndex={-1} ref={e => this.elem = e}>
        <div className="content">
          {error ? this.renderError() : this.renderResult()}
        </div>
      </div>
    );
  }
}
