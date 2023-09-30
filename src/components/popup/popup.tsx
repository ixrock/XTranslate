import styles from "./popup.module.scss"

import React, { CSSProperties } from "react";
import { action, computed, makeObservable, observable, reaction } from "mobx";
import { observer } from "mobx-react";
import { isEqual } from "lodash";
import { iconMaterialFavorite, iconMaterialFavoriteOutlined } from "../../common-vars";
import { cssNames, disposer, IClassName, noop, prevDefault, toCssColor } from "../../utils";
import { getNextTranslator, getTranslator, isRTL, ITranslationError, ITranslationResult } from "../../vendors";
import { Icon } from "../icon";
import { settingsStorage, settingsStore } from "../settings/settings.storage";
import { themeStore } from "../theme-manager/theme.storage";
import { isFavorite } from "../user-history/favorites.storage";
import { getMessage } from "../../i18n";
import { saveToFavorites } from "../../extension";

interface Props extends Omit<React.HTMLProps<any>, "className"> {
  previewMode?: boolean;
  className?: IClassName;
  initParams?: Partial<ITranslationResult>;
  translation?: ITranslationResult
  error?: ITranslationError
  tooltipParent?: HTMLElement; // where to render tooltips with "fixed" (aka following) "position"
  onPlayText?(): void;
  onTranslateNext?(): void;
  onClose?(): void;
}

@observer
export class Popup extends React.Component<Props> {
  private dispose = disposer();
  public elem: HTMLElement;

  static defaultProps: Partial<Props> = {
    tooltipParent: document.body,
    onPlayText: noop,
    onTranslateNext: noop,
  };

  @observable copied = false;

  constructor(props: Props) {
    super(props);
    makeObservable(this);

    this.dispose.push(
      reaction(() => this.props.translation, () => {
        this.copied = false; // reset copy-state for previous translation
      }),
    );
  }

  componentWillUnmount() {
    this.dispose();
  }

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

  @computed get isFavorite() {
    return isFavorite(this.props.translation);
  }

  @computed get isPreviewMode(): boolean {
    return this.props.previewMode || isEqual(this.props.translation, Popup.translationMock);
  }

  @computed get popupStyle(): CSSProperties {
    var {
      bgcMain, bgcLinear, bgcSecondary,
      borderRadius, fontFamily, fontSize, textColor,
      borderWidth, borderStyle, borderColor,
      textShadowRadius, textShadowColor, textShadowOffsetX, textShadowOffsetY,
      boxShadowColor, boxShadowBlur, boxShadowInner
    } = themeStore.data;

    return {
      position: this.isPreviewMode ? "relative" : "absolute",
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

  @computed get settingsStyle(): CSSProperties {
    var { maxHeight, maxWidth, minHeight, minWidth } = themeStore.data;
    return {
      maxWidth: !maxWidth ? "" : Math.max(maxWidth, minWidth),
      maxHeight: !maxHeight ? "" : Math.max(maxHeight, minHeight),
      minWidth: minWidth,
      minHeight: minHeight,
    }
  }

  copyToClipboard = async () => {
    const { translation, transcription, langTo, langDetected, vendor, dictionary, originalText, } = this.props.translation;

    const translator = getTranslator(vendor);
    const texts = [
      originalText,
      `${translation}${transcription ? `(${transcription})` : ""}`,

      ...dictionary.map(({ wordType, meanings }) => {
        return `${wordType}: ${meanings.map(({ word }) => word).join(", ")}`;
      }),

      getMessage("translated_with", {
        translator: translator.title,
        lang: translator.getLangPairTitle(langDetected, langTo),
      }) as string,
    ];

    try {
      await navigator.clipboard.writeText(texts.join("\n"));
      this.copied = true;
    } catch (error) {
      console.error(`failed to copy text to clipboard: ${error}`);
    }
  }

  @action
  private toggleFavorites = async () => {
    await saveToFavorites(this.props.translation, {
      isFavorite: !this.isFavorite,
    });
  };

  renderSaveToFavoritesIcon() {
    if (!settingsStore.data.showSaveToFavoriteIcon || !this.props.translation) {
      return;
    }
    return (
      <Icon
        className={styles.icon}
        material={this.isFavorite ? iconMaterialFavorite : iconMaterialFavoriteOutlined}
        tooltip={{
          className: styles.iconTooltip,
          children: getMessage("history_mark_as_favorite"),
          parentElement: this.props.tooltipParent,
        }}
        onClick={this.toggleFavorites}
      />
    )
  }

  renderCopyTranslationIcon() {
    if (!settingsStore.data.showCopyTranslationIcon) {
      return;
    }
    return (
      <Icon
        className={styles.icon}
        material={this.copied ? "task_alt" : "content_copy"}
        tooltip={{
          className: styles.iconTooltip,
          children: getMessage("popup_copy_translation_title"),
          parentElement: this.props.tooltipParent,
        }}
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
        className={styles.icon}
        material="play_circle_outline"
        tooltip={{
          className: styles.iconTooltip,
          children: getMessage("popup_play_icon_title"),
          parentElement: this.props.tooltipParent,
        }}
        onClick={prevDefault(this.props.onPlayText)}
      />
    );
  }

  renderNextTranslationIcon() {
    if (!settingsStore.data.showNextVendorIcon) return;

    var { vendor, langFrom, langTo } = this.props.translation ?? this.props.initParams ?? {};
    var nextVendor = getNextTranslator(vendor, langFrom, langTo);
    var iconTitle = getMessage("popup_next_vendor_icon_title", {
      translator: nextVendor.title
    });

    return (
      <Icon
        className={styles.icon}
        material="arrow_forward"
        tooltip={{
          className: styles.iconTooltip,
          children: iconTitle,
          parentElement: this.props.tooltipParent,
        }}
        onClick={prevDefault(this.props.onTranslateNext)}
      />
    )
  }

  renderClosePopupIcon() {
    if (!settingsStore.data.showClosePopupIcon) return;

    return (
      <Icon
        material="close"
        className={styles.icon}
        tooltip={{
          className: styles.iconTooltip,
          children: getMessage("show_close_popup_button_title"),
        }}
        onClick={this.props.onClose}
      />
    )
  }

  renderResult() {
    if (!this.props.translation) {
      return;
    }
    var { translation, transcription, dictionary, vendor, langFrom, langTo, langDetected } = this.props.translation;
    if (langDetected) langFrom = langDetected;
    const translator = getTranslator(vendor);
    const rtlClass = { [styles.rtl]: isRTL(langTo) };
    return (
      <div className={styles.translationResult} style={this.settingsStyle}>
        <div className={styles.translation}>
          {this.renderPlayTextIcon()}
          <div className={cssNames(styles.value, rtlClass)}>
            <span>{translation}</span>
            {transcription ? <i className={styles.transcription}>{" "}[{transcription}]</i> : null}
          </div>
          <div className={styles.icons}>
            {this.renderSaveToFavoritesIcon()}
            {this.renderCopyTranslationIcon()}
            {this.renderNextTranslationIcon()}
            {this.renderClosePopupIcon()}
          </div>
        </div>
        {dictionary.map(({ wordType, meanings }) =>
          <div key={wordType} className={cssNames(styles.dictionary, rtlClass)}>
            <div className={styles.wordType}>{wordType}</div>
            <div className={styles.wordMeanings}>
              {meanings.map((meaning, i, list) => {
                var last = i === list.length - 1;
                var title = meaning.translation.join(", ") || null;
                return [
                  <span key={i} className={styles.word} title={title}>{meaning.word}</span>,
                  !last ? ", " : null
                ]
              })}
            </div>
          </div>
        )}
        {
          settingsStore.data.showTranslatedFrom && (
            <div className={styles.translatedFrom}>
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
      <div className={styles.translationError}>
        <Icon material="error_outline" className={styles.errorIcon}/>
        <div className={styles.errorInfo}>
          <p>{statusCode}: {getMessage("translation_data_failed")}</p>
          <p dangerouslySetInnerHTML={{ __html: message }} />
        </div>
        {this.renderNextTranslationIcon()}
      </div>
    )
  }

  render() {
    var { popupPosition } = settingsStore.data;
    var { translation, error, className, style: customStyle } = this.props;
    var isVisible = !!(translation || error);
    var popupClass = cssNames(styles.Popup, className, popupPosition, {
      [styles.visible]: isVisible,
      [styles.fixedPos]: !this.isPreviewMode && popupPosition,
      [styles.previewMode]: this.isPreviewMode,
    });

    return (
      <div
        className={popupClass} tabIndex={-1}
        style={{ ...this.popupStyle, ...(customStyle ?? {}) }}
        ref={e => this.elem = e}
      >
        {error ? this.renderError() : this.renderResult()}
      </div>
    );
  }
}
