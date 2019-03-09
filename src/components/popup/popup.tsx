import "./popup.scss"

import React, { CSSProperties } from "react";
import { observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { autobind, cssNames, noop, prevDefault, toCssColor } from "../../utils";
import { getNextTranslator, getTranslator, isRTL, ITranslationError, ITranslationResult } from "../../vendors";
import { settingsStore } from "../settings/settings.store";
import { themeStore } from "../theme-manager/theme.store";
import { Icon } from "../icon";

interface Props extends React.HTMLProps<any> {
  preview?: boolean;
  className?: string;
  translation?: ITranslationResult
  error?: ITranslationError
  onPlayText?: () => void;
  onTranslateNext?: () => void;
}

@observer
export class Popup extends React.Component<Props> {
  public elem: HTMLElement;
  public settings = settingsStore.data;
  public theme = themeStore.data;

  static defaultProps: Partial<Props> = {
    onPlayText: noop,
    onTranslateNext: noop,
  };

  getPopupStyle(): CSSProperties {
    var {
      bgcMain, bgcLinear, bgcSecondary,
      borderRadius, fontFamily, fontSize, textColor,
      borderWidth, borderStyle, borderColor,
      textShadowRadius, textShadowColor, textShadowOffsetX, textShadowOffsetY,
      boxShadowColor, boxShadowBlur, boxShadowInner
    } = this.theme;
    return {
      background: bgcLinear
        ? `linear-gradient(180deg, ${toCssColor(bgcMain)}, ${toCssColor(bgcSecondary)})`
        : toCssColor(bgcMain),
      borderRadius: borderRadius,
      fontFamily: `${fontFamily}, sans-serif`,
      fontSize: fontSize,
      color: toCssColor(textColor),
      border: borderWidth ? [
        borderWidth + "px",
        borderStyle,
        toCssColor(borderColor)
      ].join(" ") : "",
      textShadow: (textShadowRadius || textShadowOffsetX || textShadowOffsetY) ? [
        textShadowOffsetX + "px",
        textShadowOffsetY + "px",
        textShadowRadius + "px",
        toCssColor(textShadowColor)
      ].join(" ") : "",
      boxShadow: boxShadowBlur ? [
        boxShadowInner ? "inset" : "",
        0, 0, boxShadowBlur + "px",
        toCssColor(boxShadowColor)
      ].join(" ") : ""
    };
  }

  getTranslationStyle(): CSSProperties {
    var { maxHeight, maxWidth, minHeight, minWidth } = this.theme;
    return {
      maxWidth: !maxWidth ? "" : Math.max(maxWidth, minWidth),
      maxHeight: !maxHeight ? "" : Math.max(maxHeight, minHeight),
      minWidth: minWidth,
      minHeight: minHeight,
    }
  }

  @autobind()
  copyToClipboard() {
    window.getSelection().selectAllChildren(this.elem);
    document.execCommand("copy");
  }

  renderResult() {
    const { translation: result, onPlayText, onTranslateNext } = this.props;
    if (!result) return;
    const { showTextToSpeechIcon, showNextVendorIcon, showCopyTranslationIcon } = this.settings;
    const { translation, transcription, dictionary, vendor, langFrom, langTo, langDetected } = result;
    const translator = getTranslator(vendor);
    const rtlClass = { rtl: isRTL(langTo) };
    const canPlayText = translator.canPlayText(langDetected || langFrom, translation);
    const title = __i18n("translated_with", [
      translator.title,
      `${langDetected || langFrom} → ${langTo}`.toUpperCase()
    ]).join("");
    if (showNextVendorIcon) {
      var nextVendor = getNextTranslator(vendor, langFrom, langTo);
      var iconTitle = __i18n("popup_next_vendor_icon_title", [nextVendor.title]).join("");
      var nextVendorIcon = (
        <Icon
          material="arrow_forward"
          title={iconTitle}
          onClick={prevDefault(onTranslateNext)}
        />
      )
    }
    return (
      <div className="translation-result" style={this.getTranslationStyle()}>
        <div className="translation flex gaps">
          {showTextToSpeechIcon && (
            <Icon
              material="play_circle_outline"
              title={__i18n("popup_play_icon_title")}
              disabled={!canPlayText}
              onClick={prevDefault(onPlayText)}
            />
          )}
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
        {dictionary.map(({ wordType, meanings }, index) =>
          <div key={index} className={cssNames("dictionary", rtlClass)}>
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
    var error = this.props.error;
    if (!error) return;
    var { statusCode, statusText } = error;
    return (
      <div className="translation-error">
        {statusCode} - {statusText}
      </div>
    )
  }

  render() {
    var { popupFixedPos } = this.settings;
    var { translation, error, className, style, preview } = this.props;
    var visible = translation || error;
    var popupClass = cssNames("Popup", className, {
      visible, preview,
      ["fixedPos " + popupFixedPos]: popupFixedPos && !preview
    });
    style = Object.assign(this.getPopupStyle(), style);
    return (
      <div className={popupClass} style={style} tabIndex={-1} ref={e => this.elem = e}>
        <div className="content">
          {error ? this.renderError() : this.renderResult()}
        </div>
      </div>
    );
  }
}
