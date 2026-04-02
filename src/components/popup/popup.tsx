import * as styles from "./popup.module.scss"

import React, { CSSProperties } from "react";
import { computed, makeObservable } from "mobx";
import { observer } from "mobx-react";
import sample from "lodash/sample"
import LanguagesList from "@/providers/open-ai.json"
import { materialIcons } from "@/config";
import { cssNames, prevDefault } from "@/utils";
import { toCssColor } from "@/utils/toCssColor";
import { TranslatePayload } from "@/extension";
import { freeTrialStorage, getTranslator, getTranslators, getXTranslatePro, isRTL, ITranslationError, ITranslationResult, ProviderCodeName } from "@/providers";
import { Icon } from "../icon";
import { userStore } from "@/pro";
import { sendMetric } from "@/background/metrics.bgc";
import { settingsStore } from "../settings/settings.storage";
import { themeStore } from "../theme-manager/theme.storage";
import { isFavorite } from "../user-history/favorites.storage";
import { getLocale, getMessage } from "@/i18n";
import { saveToFavoritesAction } from "@/background/history.bgc";
import { CopyToClipboardIcon } from "../copy-to-clipboard-icon";
import { PopupPromoBanner } from "@/components/popup/popup_promo";
import { Tooltip } from "@/components/tooltip";
import { Button } from "@/components/button";

export interface PopupProps extends React.HTMLProps<any> {
  previewMode?: boolean;
  showPromoBanner?: boolean;
  lastParams: TranslatePayload | undefined;
  translation: ITranslationResult | undefined;
  error: Partial<ITranslationError> | undefined;
  summarized?: string;
  onProviderChange?(name: ProviderCodeName): void;
  speak?(): Promise<HTMLAudioElement | SpeechSynthesisUtterance | void>;
  summarize?(evt: React.MouseEvent): Promise<void>;
  aiDemoTranslation?: boolean;
  aiDemoTranslationRequest?(evt: React.MouseEvent): void;
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
      vendor: settingsStore.data.vendor,
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

  get settings() {
    return settingsStore.data;
  }

  get isFavorite() {
    return isFavorite(this.translation);
  }

  get isVisible() {
    const { summarized, error } = this.props;
    return error ?? this.translation ?? summarized;
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

  @computed get resultStyles(): CSSProperties {
    let { maxHeight, maxWidth, minHeight, minWidth } = themeStore.data;
    return {
      direction: isRTL(getLocale()) ? "rtl" : "ltr",
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
    if (!this.settings.showSaveToFavoriteIcon || !this.translation) {
      return;
    }
    return (
      <Icon
        className={styles.icon}
        material={this.isFavorite ? materialIcons.favorite : materialIcons.unfavorite}
        onClick={this.toggleFavorites}
        tooltip={getMessage("history_mark_as_favorite")}
      />
    )
  }

  renderCopyTranslationIcon(content: string | ITranslationResult) {
    if (!this.settings.showCopyTranslationIcon) {
      return;
    }
    return (
      <CopyToClipboardIcon
        className={styles.icon}
        content={content}
        tooltip={getMessage("popup_copy_translation_title")}
      />
    )
  }

  // TODO: support paused/playing icon state
  renderPlayTextIcon() {
    if (!this.settings.showTextToSpeechIcon) {
      return;
    }
    return (
      <Icon
        className={styles.icon}
        material={materialIcons.ttsPlay}
        tooltip={getMessage("popup_play_icon_title")}
        onClick={prevDefault(this.props.speak)}
      />
    );
  }

  renderSummarizeIcon() {
    if (!this.settings.showPopupSummarizeIcon) {
      return;
    }

    return (
      <Icon
        className={styles.icon}
        material={materialIcons.summarize}
        tooltip={getMessage("summarize_button")}
        onClick={prevDefault(this.props.summarize)}
      />
    );
  }

  private onProviderChange = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    this.props?.onProviderChange?.(evt.target.value as ProviderCodeName);
  };

  renderProviderSelectIcon(): React.ReactNode {
    if (!this.settings.showProviderSelectIcon) {
      return;
    }

    const providerName = this.translation?.vendor ?? this.props.lastParams?.provider;
    const provider = getTranslator(providerName);
    const providerIconTooltipId = "xtranslate-select-provider-icon";
    return (
      <div className={styles.providerSelect} id={providerIconTooltipId}>
        <Icon
          small interactive
          svg={providerName}
          className={styles.providerSelectIcon}
        />
        <Tooltip
          following
          anchorId={providerIconTooltipId}
          children={getMessage("popup_select_provider_title")}
        />
        <select
          value={providerName}
          onChange={this.onProviderChange}
          title={provider?.title}
        >
          {getTranslators().map(({ name, title, isAvailable }) => {
            if (!isAvailable()) return;
            return <option key={name} value={name}>{title}</option>
          })}
        </select>
      </div>
    );
  }

  renderFreeTrialActionsOrUpgradeToProSuggestion() {
    const { aiDemoTranslation, previewMode, aiDemoTranslationRequest } = this.props;
    const freeTrial = freeTrialStorage.get();
    const { finished, showBanner, todayRemain } = freeTrial;

    if (userStore.isProActive || previewMode || !showBanner) {
      return null;
    }

    const openLogin = () => {
      window.open(getXTranslatePro().loginUrl, "_blank");
      void sendMetric("promo_free_ai_login_clicked", {});
    };

    const hideBanner = () => {
      freeTrial.showBanner = false;
      void sendMetric("promo_free_ai_hide_banner", {});
    };

    return (
      <label className={styles.freeTrialDemo}>
        <input type="checkbox"/>
        {aiDemoTranslation && (
          <div>
            {getMessage("pro_self_improve_with_ai_free_remain_today", {
              count: todayRemain,
            })}
          </div>
        )}
        {!finished && !aiDemoTranslation && (
          <>
            <span>{getMessage("pro_self_improve_with_ai_suggestion")}</span>
            <Button
              outline
              label={getMessage("pro_self_improve_with_ai_action_label")}
              onClick={aiDemoTranslationRequest}
            />
          </>
        )}
        {finished && (
          <div className={styles.freeTrialExhausted}>
            <Icon
              small material="close"
              className={styles.closeIcon}
              onClick={prevDefault(hideBanner)}
            />
            <span>{getMessage("pro_self_improve_with_ai_free_exausted_total")}</span>
            <span>
              {getMessage("pro_self_improve_with_ai_login", {
                loginLink: v => <Button outline onClick={openLogin}>{v}</Button>
              })}
            </span>
          </div>
        )}
        <div className={styles.aiFeatureDetails}>
          {getMessage("pro_self_ad_features")}
        </div>
      </label>
    );
  }

  renderResult(): React.ReactNode {
    if (!this.translation) return;
    let { translation, transcription, dictionary = [], vendor, langFrom, langTo, langDetected } = this.translation;
    if (langDetected) langFrom = langDetected;

    const translator = getTranslator(vendor);
    const directionResults = isRTL(langTo) ? "rtl" : "ltr";

    return (
      <div className={styles.translationResult} style={this.resultStyles}>
        <div className={styles.translation}>
          <div className={styles.icons}>
            {this.renderPlayTextIcon()}
          </div>
          <div className={styles.value} style={{ direction: directionResults }}>
            <span>{translation}</span>
            {transcription ? <i className={styles.transcription}>{" "}[{transcription}]</i> : null}
          </div>
          <div className={styles.icons}>
            {this.renderSummarizeIcon()}
            {this.renderSaveToFavoritesIcon()}
            {this.renderCopyTranslationIcon(this.translation)}
            {this.renderProviderSelectIcon()}
          </div>
        </div>
        {dictionary.map(({ wordType, meanings }) =>
          <div key={wordType} className={styles.dictionary} style={{ direction: directionResults }}>
            <div className={styles.wordType}>{wordType}</div>
            <div className={styles.wordMeanings}>
              {meanings.map((meaning, i, list) => {
                const translation = meaning.translation.join(", ");
                const examples: React.ReactNode = meaning.examples?.map((example, i) => <div key={i}>{example.join(" - ")}</div>);
                return (
                  <React.Fragment key={i}>
                    {meaning.word && <div className={styles.dictWord}>{meaning.word}</div>}
                    {translation && (
                      <div className={styles.dictTranslation}>
                        {translation}{" "}
                        {examples && <Icon small material="info_outline" tooltip={examples}/>}
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        )}
        {this.renderFreeTrialActionsOrUpgradeToProSuggestion()}
        {
          this.settings.showTranslatedFrom && (
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
    return (
      <div className={styles.translationError}>
        <div className={styles.errorInfo}>
          {error.message && (
            <div>
              <Icon material="error_outline" className={styles.errorIcon}/>{" "}
              {getMessage("translation_data_failed")}
            </div>
          )}
          {error.message}
        </div>
        <div className={styles.icons}>
          {this.renderProviderSelectIcon()}
        </div>
      </div>
    )
  }

  renderSummarized() {
    const { summarized, error } = this.props;
    if (!summarized || error) return;

    return (
      <div className={styles.translationResult} style={this.resultStyles}>
        <div className={styles.translation}>
          <span className={styles.value}>
            {summarized}
          </span>
          <div className={styles.icons}>
            {this.renderCopyTranslationIcon(summarized)}
            {this.renderProviderSelectIcon()}
          </div>
        </div>
      </div>
    )
  }

  render() {
    const { popupPosition } = this.settings;
    const { previewMode, error, className, style: customStyle, showPromoBanner } = this.props;
    const hasAutoPosition = popupPosition === "";
    const popupClass = cssNames(styles.Popup, className, popupPosition, {
      [styles.visible]: this.isVisible,
      [styles.fixedPos]: !previewMode && !hasAutoPosition,
      [styles.previewMode]: previewMode,
    });

    const promoBanner = showPromoBanner && userStore.isPromoVisible ? <PopupPromoBanner/> : null;
    const mainContent = promoBanner ?? this.renderResult() ?? this.renderSummarized();

    return (
      <div
        className={popupClass} tabIndex={-1}
        style={{ ...this.popupStyle, ...(customStyle ?? {}) }}
        ref={this.elemRef}
      >
        {error ? this.renderError() : mainContent}
      </div>
    );
  }
}
