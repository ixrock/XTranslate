import * as styles from "./popup.module.scss"

import React, { CSSProperties } from "react";
import { action, computed, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import isEqual from "lodash/isEqual";
import { materialIcons } from "../../common-vars";
import { cssNames, disposer, IClassName, noop, prevDefault } from "../../utils";
import { copyToClipboard } from "../../utils/copy-to-clipboard";
import { toCssColor } from "../../utils/toCssColor";
import { getNextTranslator, getTranslator, isRTL, ITranslationError, ITranslationResult } from "../../providers";
import { Icon } from "../icon";
import { settingsStorage, settingsStore } from "../settings/settings.storage";
import { themeStore } from "../theme-manager/theme.storage";
import { isFavorite } from "../user-history/favorites.storage";
import { getLocale, getMessage } from "../../i18n";
import { saveToFavoritesAction } from "../../background/history.bgc";

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
  @observable translation = this.props.translation;

  constructor(props: Props) {
    super(props);
    makeObservable(this);
  }

  @action
  componentDidUpdate() {
    this.translation = this.props.translation;
  }

  componentWillUnmount() {
    this.dispose();
  }

  static get translationMock(): ITranslationResult {
    return {
      vendor: settingsStorage.defaultValue.vendor,
      langFrom: "en",
      langTo: getLocale(),
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

  get isFavorite() {
    return isFavorite(this.props.translation);
  }

  get isPreviewMode(): boolean {
    return this.props.previewMode || isEqual(this.props.translation, Popup.translationMock);
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

  @action
  copyToClipboard = async () => {
    await copyToClipboard(this.props.translation);
    this.copied = true;
    setTimeout(() => this.copied = false, 2500); // reset in 2,5 seconds
  }

  @action
  private toggleFavorites = async () => {
    await saveToFavoritesAction(this.props.translation, {
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
        material={this.isFavorite ? materialIcons.favorite : materialIcons.unfavorite}
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
        material={this.copied ? materialIcons.copiedTranslation : materialIcons.copyTranslation}
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
        material={materialIcons.ttsPlay}
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
        material={materialIcons.nextTranslation}
        tooltip={{
          className: styles.iconTooltip,
          children: iconTitle,
          parentElement: this.props.tooltipParent,
        }}
        onClick={prevDefault(this.props.onTranslateNext)}
      />
    )
  }

  renderResult() {
    if (!this.props.translation) return;

    let { translation, transcription, dictionary, vendor, langFrom, langTo, langDetected } = this.props.translation;
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
            {this.renderNextTranslationIcon()}
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
    var { error } = this.props;
    if (!error) return;
    var { statusCode, message } = error;
    return (
      <div className={styles.translationError}>
        <Icon material="error_outline" className={styles.errorIcon}/>
        <div className={styles.errorInfo}>
          <p>{statusCode}: {getMessage("translation_data_failed")}</p>
          <p dangerouslySetInnerHTML={{ __html: message }}/>
        </div>
        {this.renderNextTranslationIcon()}
      </div>
    )
  }

  private bindRef = (elem: HTMLElement) => {
    this.elem = elem;
  }

  render() {
    const { popupPosition } = settingsStore.data;
    const { translation, error, className, style: customStyle } = this.props;
    const hasAutoPosition = popupPosition === "";
    const isVisible = !!(translation || error);
    const popupClass = cssNames(styles.Popup, className, popupPosition, {
      [styles.visible]: isVisible,
      [styles.fixedPos]: !this.isPreviewMode && !hasAutoPosition,
      [styles.previewMode]: this.isPreviewMode,
    });

    return (
      <div
        className={popupClass} tabIndex={-1}
        style={{ ...this.popupStyle, ...(customStyle ?? {}) }}
        ref={this.bindRef}
      >
        {error ? this.renderError() : this.renderResult()}
      </div>
    );
  }
}
