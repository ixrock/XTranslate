import "./popup.scss"

import React, { CSSProperties } from "react";
import { observer } from "mobx-react";
import { __i18n } from "../../extension";
import { cssNames, noop, prevDefault, toCssColor } from "../../utils";
import { getNextTranslator, getTranslator, isRTL, ITranslationError, ITranslationResult } from "../../vendors";
import { Icon } from "../icon";
import { defaultSettings, settingsStore } from "../settings/settings.store";
import { themeStore } from "../theme-manager/theme.store";

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

  static defaultProps: Partial<Props> = {
    onPlayText: noop,
    onTranslateNext: noop,
  };

  static demoTranslation: ITranslationResult = {
    vendor: defaultSettings.vendor,
    langFrom: "en",
    langTo: navigator.language.split("-")[0],
    translation: __i18n("popup_demo_translation"),
    dictionary: [
      {
        wordType: __i18n("popup_demo_dictionary_noun"),
        meanings: [
          {
            word: __i18n("popup_demo_dictionary_values"),
            translation: []
          }
        ]
      }
    ]
  };

  get translation() {
    var { preview, translation } = this.props;
    return translation || (preview ? Popup.demoTranslation : null);
  }

  getPopupStyle(): CSSProperties {
    var {
      bgcMain, bgcLinear, bgcSecondary,
      borderRadius, fontFamily, fontSize, textColor,
      borderWidth, borderStyle, borderColor,
      textShadowRadius, textShadowColor, textShadowOffsetX, textShadowOffsetY,
      boxShadowColor, boxShadowBlur, boxShadowInner
    } = themeStore.data;
    return {
      background: bgcLinear
        ? `linear-gradient(180deg, ${toCssColor(bgcMain)}, ${toCssColor(bgcSecondary)})`
        : toCssColor(bgcMain),
      borderRadius: borderRadius,
      fontFamily: `${fontFamily}, sans-serif`,
      fontSize: fontSize + "px",
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
    var { maxHeight, maxWidth, minHeight, minWidth } = themeStore.data;
    return {
      maxWidth: !maxWidth ? "" : Math.max(maxWidth, minWidth),
      maxHeight: !maxHeight ? "" : Math.max(maxHeight, minHeight),
      minWidth: minWidth,
      minHeight: minHeight,
    }
  }

  copyToClipboard = () => {
    window.getSelection().selectAllChildren(this.elem);
    document.execCommand("copy");
  }

  renderCopyTranslationIcon() {
    if (!settingsStore.data.showCopyTranslationIcon) {
      return;
    }
    return (
      <Icon
        material="content_copy"
        title={__i18n("popup_copy_translation_title")}
        onClick={this.copyToClipboard}
      />
    )
  }

  renderPlayTextIcon() {
    if (!settingsStore.data.showTextToSpeechIcon) {
      return;
    }
    return (
      <Icon
        material="play_circle_outline"
        title={__i18n("popup_play_icon_title")}
        onClick={prevDefault(this.props.onPlayText)}
      />
    );
  }

  renderNextTranslationIcon() {
    if (!settingsStore.data.showNextVendorIcon) {
      return;
    }
    var { vendor, langFrom, langTo } = this.translation;
    var nextVendor = getNextTranslator(vendor, langFrom, langTo);
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
    if (!this.translation) {
      return;
    }
    var { translation, transcription, dictionary, vendor, langFrom, langTo, langDetected } = this.translation;
    if (langDetected) langFrom = langDetected;
    const translator = getTranslator(vendor);
    const rtlClass = { rtl: isRTL(langTo) };
    return (
      <div className="translation-result" style={this.getTranslationStyle()}>
        <div className="translation flex gaps">
          {this.renderPlayTextIcon()}
          <div className={cssNames("value box grow", rtlClass)}>
            <span>{translation}</span>
            {transcription ? <i className="transcription">{" "}[{transcription}]</i> : null}
          </div>
          <div className="icons">
            {this.renderCopyTranslationIcon()}
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
        {
          settingsStore.data.showTranslatedFrom && (
            <div className="translated-from">
              {__i18n("translated_from", [translator.langFrom[langFrom]]).join("")}
              {` (${translator.title})`}
            </div>
          )
        }
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
    var { popupFixedPos } = settingsStore.data;
    var { error, className, style, preview } = this.props;
    var isVisible = !!(this.translation || error);
    var popupClass = cssNames("Popup", className, {
      preview: preview,
      visible: isVisible,
      ["fixedPos " + popupFixedPos]: popupFixedPos && !preview
    });
    style = Object.assign(this.getPopupStyle(), style);
    return (
      <div className={popupClass} style={style} tabIndex={-1} ref={e => this.elem = e}>
        {error ? this.renderError() : this.renderResult()}
      </div>
    );
  }
}
