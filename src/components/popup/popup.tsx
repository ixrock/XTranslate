import "./popup.scss"

import React, { CSSProperties } from "react";
import { observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { autobind, cssNames, noop, prevDefault, toCssColor } from "../../utils";
import { getNextTranslator, getTranslator, isRTL, ITranslationError, ITranslationResult } from "../../vendors";
import { settingsStore } from "../settings/settings.store";
import { themeStore } from "../theme-manager/theme.store";
import { Icon } from "../icon";

export interface ITranslateParams {
  vendor: string;
  from: string;
  to: string;
  text: string;
}

interface Props extends React.HTMLProps<any> {
  preview?: boolean;
  className?: string;
  params: ITranslateParams;
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

  renderNextTranslationIcon() {
    if (!this.settings.showNextVendorIcon || !this.props.params) {
      return;
    }
    var { vendor, from, to } = this.props.params;
    var nextVendor = getNextTranslator(vendor, from, to);
    var iconTitle = __i18n("popup_next_vendor_icon_title", [nextVendor.title]).join("");
    return (
      <Icon
        material="arrow_forward"
        title={iconTitle}
        onClick={prevDefault(this.props.onTranslateNext)}
      />
    )
  }

  renderResult() {
    if (!this.props.translation) return;
    const { showTextToSpeechIcon, showCopyTranslationIcon } = this.settings;
    const { translation, transcription, dictionary, vendor, langFrom, langTo, langDetected } = this.props.translation;
    const translator = getTranslator(vendor);
    const rtlClass = { rtl: isRTL(langTo) };
    const canPlayText = translator.canPlayText(langDetected || langFrom, translation);
    const title = __i18n("translated_with", [
      translator.title,
      `${langDetected || langFrom} → ${langTo}`.toUpperCase()
    ]).join("");
    return (
      <div className="translation-result" style={this.getTranslationStyle()}>
        <div className="translation flex gaps">
          {showTextToSpeechIcon && (
            <Icon
              material="play_circle_outline"
              title={__i18n("popup_play_icon_title")}
              disabled={!canPlayText}
              onClick={prevDefault(this.props.onPlayText)}
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
            {this.renderNextTranslationIcon()}
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
    var { error } = this.props;
    if (!error) return;
    var { statusCode, url } = error;
    return (
      <div className="translation-error">
        <div className="title flex gaps align-center">
          <Icon material="error_outline" className="info"/>
          <div className="box grow">
            {statusCode}: {__i18n("translation_data_failed")}
          </div>
          {this.renderNextTranslationIcon()}
        </div>
        <a href={url} target="_blank">
          {__i18n("translation_data_failed_check_url")}
        </a>
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
