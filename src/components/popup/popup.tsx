import "./popup.scss"

import React, { CSSProperties } from "react";
import { makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { cssNames, noop, prevDefault, toCssColor } from "../../utils";
import { getNextTranslator, getTranslator, isRTL, ITranslationError, ITranslationResult } from "../../vendors";
import { Icon } from "../icon";
import { settingsStorage, settingsStore } from "../settings/settings.storage";
import { themeStore } from "../theme-manager/theme.storage";
import { getMessage } from "../../i18n";

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
  @observable copied = false;

  constructor(props: Props) {
    super(props);
    makeObservable(this);

    disposeOnUnmount(this, [
      reaction(() => this.props.translation, () => {
        this.copied = false;
      }),
    ]);
  }

  static defaultProps: Partial<Props> = {
    onPlayText: noop,
    onTranslateNext: noop,
  };

  static get translationMock(): ITranslationResult {
    return {
      vendor: settingsStorage.defaultValue.vendor,
      langFrom: "en",
      langTo: navigator.language.split("-")[0],
      translation: getMessage("popup_demo_translation"),
      dictionary: [
        {
          wordType: getMessage("popup_demo_dictionary_noun"),
          meanings: [
            {
              word: getMessage("popup_demo_dictionary_values"),
              translation: []
            }
          ]
        }
      ]
    }
  }

  get translation() {
    var { preview, translation } = this.props;
    return translation || (preview ? Popup.translationMock : null);
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

  copyToClipboard = async () => {
    const { translation, transcription, langFrom, langTo, vendor, dictionary, originalText } = this.translation;
    const translator = getTranslator(vendor);

    const texts = [
      originalText,
      `${translation}${transcription ? `(${transcription})` : ""}`,

      ...dictionary.map(({ wordType, meanings }) => {
        return `${wordType}: ${meanings.map(({ word }) => word).join(", ")}`;
      }),

      getMessage("translated_with", {
        translator: translator.title,
        lang: [translator.langFrom[langFrom], translator.langTo[langTo]].join(' → '),
      }) as string,
    ];

    await navigator.clipboard.writeText(texts.join("\n"));
    this.copied = true;
  }

  renderCopyTranslationIcon() {
    if (!settingsStore.data.showCopyTranslationIcon) {
      return;
    }
    return (
      <Icon
        material={this.copied ? "task_alt" : "content_copy"}
        title={getMessage("popup_copy_translation_title")}
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
        title={getMessage("popup_play_icon_title")}
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
    var iconTitle = getMessage("popup_next_vendor_icon_title", {
      translator: nextVendor.title
    }) as string;
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
        {dictionary.map(({ wordType, meanings }) =>
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
        {
          settingsStore.data.showTranslatedFrom && (
            <div className="translated-from">
              {getMessage("translated_from", { lang: translator.langFrom[langFrom] })}
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
    var { statusCode, message } = error;
    return (
      <div className="translation-error">
        <div className="title flex gaps align-center">
          <Icon material="error_outline" className="info"/>
          <div className="box grow">
            <p>{statusCode}: {getMessage("translation_data_failed")}</p>
            <p>{message}</p>
          </div>
          {this.renderNextTranslationIcon()}
        </div>
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
