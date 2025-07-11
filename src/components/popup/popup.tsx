import * as styles from "./popup.module.scss"

import React, { CSSProperties } from "react";
import { computed, makeObservable } from "mobx";
import { observer } from "mobx-react";
import isEqual from "lodash/isEqual";
import sample from "lodash/sample"
import LanguagesList from "@/providers/google.json"
import { materialIcons } from "@/config";
import { cssNames, prevDefault } from "@/utils";
import { toCssColor } from "@/utils/toCssColor";
import { TranslatePayload } from "@/extension";
import { getTranslator, getTranslators, isRTL, ITranslationError, ITranslationResult, ProviderCodeName } from "@/providers";
import { Icon } from "../icon";
import { settingsStore } from "../settings/settings.storage";
import { themeStore } from "../theme-manager/theme.storage";
import { isFavorite } from "../user-history/favorites.storage";
import { getLocale, getMessage } from "@/i18n";
import { saveToFavoritesAction } from "@/background/history.bgc";
import { CopyToClipboardIcon } from "../copy-to-clipboard-icon";

export interface PopupProps extends React.HTMLProps<any> {
  previewMode?: boolean;
  lastParams: TranslatePayload | undefined;
  translation: ITranslationResult | undefined;
  error: ITranslationError | undefined;
  tooltipParentElem?: HTMLElement;
  onProviderChange?(name: ProviderCodeName): void;
  onPlayText?(): void;
}

@observer
export class Popup extends React.Component<PopupProps> {
  private elemRef = React.createRef<HTMLDivElement>();
  private translationMock?: ITranslationResult;

  static get translationMock(): ITranslationResult {
    const langs = { ...LanguagesList.from };
    delete langs.auto;
    delete langs.en;
    return {
      vendor: ProviderCodeName.GOOGLE,
      langFrom: sample(Object.keys(langs)),
      langTo: "en",
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

  constructor(props: PopupProps) {
    super(props);
    makeObservable(this);
  }

  get elem() {
    return this.elemRef.current;
  }

  get isFavorite() {
    return isFavorite(this.translation);
  }

  get translation(): ITranslationResult | undefined {
    if (this.props.previewMode) {
      this.translationMock ??= Popup.translationMock;
      return this.translationMock;
    }
    return this.props.translation;
  }

  get popupStyle(): CSSProperties {
    const {
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
      fontFamily: fontFamily,
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
    let { maxHeight, maxWidth, minHeight, minWidth } = themeStore.data;
    return {
      maxWidth: !maxWidth ? "" : Math.max(maxWidth, minWidth),
      maxHeight: !maxHeight ? "" : Math.max(maxHeight, minHeight),
      minWidth: minWidth,
      minHeight: minHeight,
    }
  }

  toggleFavorites = () => {
    return saveToFavoritesAction({
      item: this.translation,
      isFavorite: !this.isFavorite,
      source: "popup",
    });
  };

  renderSaveToFavoritesIcon() {
    if (!settingsStore.data.showSaveToFavoriteIcon || !this.translation) {
      return;
    }
    return (
      <Icon
        className={styles.icon}
        material={this.isFavorite ? materialIcons.favorite : materialIcons.unfavorite}
        onClick={this.toggleFavorites}
        tooltip={{
          children: getMessage("history_mark_as_favorite"),
          parentElement: this.props.tooltipParentElem,
        }}
      />
    )
  }

  renderCopyTranslationIcon() {
    if (!settingsStore.data.showCopyTranslationIcon) {
      return;
    }
    return (
      <CopyToClipboardIcon
        className={styles.icon}
        content={this.translation}
        tooltip={{
          children: getMessage("popup_copy_translation_title"),
          parentElement: this.props.tooltipParentElem,
        }}
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
        material={materialIcons.ttsPlay}
        tooltip={{
          children: getMessage("popup_play_icon_title"),
          parentElement: this.props.tooltipParentElem,
        }}
        onClick={prevDefault(this.props.onPlayText)}
      />
    );
  }

  private onProviderChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    this.props?.onProviderChange?.(evt.target.value as ProviderCodeName);
  };

  renderProviderSelectIcon(): React.ReactNode {
    if (!settingsStore.data.showProviderSelectIcon) {
      return;
    }
    const providerName = this.translation?.vendor ?? this.props.lastParams?.provider;
    const provider = getTranslator(providerName);
    return (
      <div className={styles.providerSelect}>
        <Icon
          small interactive
          svg={providerName}
          className={styles.providerSelectIcon}
        />
        <select value={providerName} onChange={this.onProviderChange} title={provider?.title}>
          {getTranslators().map(({ name, title, isAvailable }) => {
            if (!isAvailable()) return;
            return <option key={name} value={name}>{title}</option>
          })}
        </select>
      </div>
    );
  }

  renderResult() {
    if (!this.translation) return;

    let { translation, transcription, dictionary, vendor, langFrom, langTo, langDetected } = this.translation;
    if (langDetected) langFrom = langDetected;

    const translator = getTranslator(vendor);
    const directionUI = isRTL(getLocale()) ? "rtl" : "ltr";
    const directionResults = isRTL(langTo) ? "rtl" : "ltr";
    const popupResultStyle: React.CSSProperties = {
      ...this.settingsStyle,
      direction: directionUI,
    };

    return (
      <div className={styles.translationResult} style={popupResultStyle}>
        <div className={styles.translation}>
          {this.renderPlayTextIcon()}
          <div className={styles.value} style={{ direction: directionResults }}>
            <span>{translation}</span>
            {transcription ? <i className={styles.transcription}>{" "}[{transcription}]</i> : null}
          </div>
          <div className={styles.icons}>
            {this.renderSaveToFavoritesIcon()}
            {this.renderCopyTranslationIcon()}
            {this.renderProviderSelectIcon()}
          </div>
        </div>
        {dictionary.map(({ wordType, meanings }) =>
          <div key={wordType} className={styles.dictionary} style={{ direction: directionResults }}>
            <div className={styles.wordType}>{wordType}</div>
            <div className={styles.wordMeanings}>
              {meanings.map((meaning, i, list) => {
                let last = i === list.length - 1;
                let title = meaning.translation.join(", ") || null;
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
              {getMessage("translated_from", {
                lang: translator.langFrom[langFrom] ?? langFrom,
              })}
              {` (${translator.title})`}
            </div>
          )
        }
      </div>
    );
  }

  renderError() {
    const { error } = this.props;
    if (!error) return;
    const { statusCode, message } = error;
    return (
      <div className={styles.translationError}>
        <Icon material="error_outline" className={styles.errorIcon}/>
        <div className={styles.errorInfo}>
          <p>{statusCode}: {getMessage("translation_data_failed")}</p>
          <p dangerouslySetInnerHTML={{ __html: message }}/>
        </div>
        {this.renderProviderSelectIcon()}
      </div>
    )
  }

  render() {
    const { popupPosition } = settingsStore.data;
    const { previewMode, error, className, style: customStyle } = this.props;
    const hasAutoPosition = popupPosition === "";
    const popupClass = cssNames(styles.Popup, className, popupPosition, {
      [styles.visible]: Boolean(this.translation || error),
      [styles.fixedPos]: !previewMode && !hasAutoPosition,
      [styles.previewMode]: previewMode,
    });

    return (
      <div
        className={popupClass} tabIndex={-1}
        style={{ ...this.popupStyle, ...(customStyle ?? {}) }}
        ref={this.elemRef}
      >
        {error ? this.renderError() : this.renderResult()}
      </div>
    );
  }
}
