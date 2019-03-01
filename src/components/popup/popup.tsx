import "./popup.scss"

import * as React from "react";
import { observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { MessageType } from "../../extension/message";
import { sendMessage } from "../../extension/runtime";
import { cssNames } from "../../utils/cssNames";
import { cssColor } from "../color-picker/cssColor";
import { getNextVendor, getVendorByName, Translation, TranslationError } from "../../vendors";
import { autobind } from "../../utils/autobind";
import { settingsStore } from "../settings/settings.store";
import { themeStore } from "../theme-manager/theme.store";
import { Icon } from "../icon";

interface Props extends React.HTMLProps<any> {
  preview?: boolean;
  className?: any
  translation?: Translation
  error?: TranslationError
  position?: React.CSSProperties
  next?: () => void;
}

@observer
export class Popup extends React.Component<Props> {
  public elem: HTMLElement;
  settings = settingsStore.data;
  theme = themeStore.data;

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.translation !== nextProps.translation) {
      this.stopPlaying();
    }
  }

  getPopupStyle(): React.CSSProperties {
    var {
      bgcMain, bgcLinear, bgcSecondary,
      borderRadius, fontFamily, fontSize, textColor,
      borderWidth, borderStyle, borderColor,
      textShadowRadius, textShadowColor, textShadowOffsetX, textShadowOffsetY,
      boxShadowColor, boxShadowBlur, boxShadowInner
    } = this.theme;
    return {
      background: bgcLinear
        ? `linear-gradient(180deg, ${cssColor(bgcMain)}, ${cssColor(bgcSecondary)})`
        : cssColor(bgcMain),
      borderRadius: borderRadius,
      fontFamily: `${fontFamily}, sans-serif`,
      fontSize: fontSize,
      color: cssColor(textColor),
      border: borderWidth ? [
        borderWidth + "px",
        borderStyle,
        cssColor(borderColor)
      ].join(" ") : "",
      textShadow: (textShadowRadius || textShadowOffsetX || textShadowOffsetY) ? [
        textShadowOffsetX + "px",
        textShadowOffsetY + "px",
        textShadowRadius + "px",
        cssColor(textShadowColor)
      ].join(" ") : "",
      boxShadow: boxShadowBlur ? [
        boxShadowInner ? "inset" : "",
        0, 0, boxShadowBlur + "px",
        cssColor(boxShadowColor)
      ].join(" ") : ""
    };
  }

  getTranslationStyle(): React.CSSProperties {
    var { maxHeight, maxWidth, minHeight, minWidth } = this.theme;
    return {
      maxWidth: !maxWidth ? "" : Math.max(maxWidth, minWidth),
      maxHeight: !maxHeight ? "" : Math.max(maxHeight, minHeight),
      minWidth: minWidth,
      minHeight: minHeight,
    }
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
    const { showTextToSpeechIcon, showNextVendorIcon, showCopyTranslationIcon } = this.settings;
    const vendorApi = getVendorByName(vendor);
    const rtlClass = { rtl: vendorApi.isRightToLeft(langTo) };
    const canPlayText = vendorApi.canPlayText(langDetected || langFrom, translation);
    const title = __i18n("translated_with", [
      vendorApi.title, `${langDetected || langFrom} → ${langTo}`.toUpperCase()
    ]).join("");
    var nextVendorIcon = null;
    if (showNextVendorIcon) {
      let nextVendor = getNextVendor(vendor, langFrom, langTo);
      let iconTitle = __i18n("popup_next_vendor_icon_title", [nextVendor.title]).join("");
      nextVendorIcon = <Icon material="arrow_forward" onClick={this.translateNextVendor} title={iconTitle}/>
    }
    return (
      <div className="translation-result" style={this.getTranslationStyle()}>
        <div className="translation flex gaps">
          {showTextToSpeechIcon ? (
            <Icon
              material="play_circle_outline"
              title={__i18n("popup_play_icon_title")}
              disabled={!canPlayText}
              onClick={this.playText}/>
          ) : null}
          <div className={cssNames("value box grow", rtlClass)} title={title}>
            <span>{translation}</span>
            {transcription ? <i className="transcription">{" "}[{transcription}]</i> : null}
          </div>
          <div className="icons">
            {showCopyTranslationIcon && (
              <Icon
                material="content_copy"
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
    var { translation, error, position, className, preview } = this.props;
    var { popupFixedPos } = this.settings;
    var style = Object.assign({}, this.getPopupStyle(), !popupFixedPos ? position : {});
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
