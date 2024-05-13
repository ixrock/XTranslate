import "./select-language.scss";

import React from "react";
import { action, computed, makeObservable } from "mobx";
import { observer } from "mobx-react";
import { ReactSelect, ReactSelectGroup, ReactSelectOption } from "../select";
import { cssNames } from "../../utils";
import { getTranslator } from "../../vendors";
import { getMessage } from "../../i18n";
import { Icon } from "../icon";
import { FavoriteLangDirection, settingsStore } from "../settings/settings.storage";

export interface Props {
  className?: string;
  vendor?: string;
  from?: string;
  to?: string;
  showInfoIcon?: boolean;
  showReverseTranslation?: boolean;
  onChange?(update: { langFrom: string, langTo: string }): void;
  onSwap?(update: { langFrom: string, langTo: string }): void;
}

@observer
export class SelectLanguage extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
    makeObservable(this);
  }

  @computed get langFrom() {
    return this.props.from ?? settingsStore.data.langFrom;
  }

  @computed get langTo() {
    return this.props.to ?? settingsStore.data.langTo;
  }

  @computed get vendor() {
    return this.props.vendor ?? settingsStore.data.vendor;
  }

  @computed get sourceFavorites(): string[] {
    return settingsStore.getFavorites(this.vendor, "source")
  }

  @computed get targetFavorites(): string[] {
    return settingsStore.getFavorites(this.vendor, "target")
  }

  @computed get sourceLanguageOptions(): ReactSelectGroup<string>[] {
    var { langFrom: sourceLangList } = getTranslator(this.vendor);

    var getOption = (lang: string): ReactSelectOption<string> => ({
      value: lang,
      isDisabled: lang == this.langTo,
      isSelected: lang == this.langFrom,
      label: sourceLangList[lang as keyof typeof sourceLangList],
    });

    const sourceLanguageOptions = Object.keys(sourceLangList).map(getOption);

    // return groups with favorites if exists
    if (this.sourceFavorites.length > 0) {
      return [
        { options: this.sourceFavorites.map(getOption), label: getMessage("favorites_lang_title") },
        { options: sourceLanguageOptions, label: getMessage("source_lang_placeholder") },
      ]
    }

    return [
      { options: sourceLanguageOptions }
    ];
  }

  @computed get targetLanguageOptions(): ReactSelectGroup<string>[] {
    var { langTo: targetLangList } = getTranslator(this.vendor);

    var getOption = (lang: string): ReactSelectOption<string> => ({
      value: lang,
      isDisabled: lang == this.langFrom,
      isSelected: lang == this.langTo,
      label: targetLangList[lang as keyof typeof targetLangList],
    });

    const targetLanguageOptions = Object.keys(targetLangList).map(getOption);

    // return multiple groups when favorites list not empty
    if (this.targetFavorites.length > 0) {
      return [
        { options: this.targetFavorites.map(getOption), label: getMessage("favorites_lang_title") },
        { options: targetLanguageOptions, label: getMessage("target_lang_placeholder") },
      ]
    }

    return [
      { options: targetLanguageOptions },
    ];
  }

  @computed get reverseLanguageOptions(): ReactSelectOption<string>[] {
    var { langToReverse } = settingsStore.data;
    var { langTo: targetLangList } = getTranslator(this.vendor);

    var getOption = (lang: string): ReactSelectOption<string> => ({
      value: lang,
      isDisabled: lang == this.langTo,
      isSelected: lang == langToReverse,
      label: targetLangList[lang as keyof typeof targetLangList],
    });

    return Object.keys(targetLangList).map(getOption);
  }

  @action
  private onSwap = () => {
    const { langFrom, langTo } = this;
    if (langFrom === "auto") return; // not possible translate to "auto"
    this.onChange({ sourceLang: langTo, targetLang: langFrom }); // trigger update
    this.props.onSwap?.({ langFrom, langTo });
  }

  @action
  private onChange = (update: { sourceLang?: string, targetLang?: string } = {}) => {
    const {
      sourceLang = this.langFrom,
      targetLang = this.langTo,
    } = update;

    if (this.props.onChange) {
      this.props.onChange({ langFrom: sourceLang, langTo: targetLang })
    } else {
      settingsStore.data.langFrom = sourceLang;
      settingsStore.data.langTo = targetLang;
    }
  }

  @action
  toggleFavorite = (evt: React.MouseEvent, lang: string, sourceType: FavoriteLangDirection) => {
    const isAutoDetect = lang == "auto"
    const isToggleAction = evt.metaKey || (evt.altKey && evt.shiftKey);
    if (isAutoDetect || !isToggleAction) return; // skip: normal select

    // save updated favorite to storage
    settingsStore.toggleFavorite({
      vendor: this.vendor,
      sourceType, lang
    });

    // skip selecting new language (hopefully)
    evt.stopPropagation();
    evt.preventDefault();
  }

  formatLanguageLabel(opts: { lang: string, title: string, sourceType?: FavoriteLangDirection }): React.ReactNode {
    const flagIcon = getFlagIcon(opts.lang);
    return (
      <div
        className={cssNames("language flex gaps align-center", opts.lang)}
        onClick={opts.sourceType ? evt => this.toggleFavorite(evt, opts.lang, opts.sourceType) : undefined}
      >
        {flagIcon && <img className="country-icon" src={flagIcon} alt=""/>}
        <span>{opts.title}</span>
      </div>
    )
  }

  @action
  setReverseTranslateLanguage(lang: string) {
    settingsStore.data.langToReverse = lang;
  }

  renderReverseTranslationSettingsPanel() {
    var { showReverseTranslation } = this.props;
    if (!showReverseTranslation) return;

    var { langTo } = this;
    const langToTitle = getTranslator(this.vendor).langTo[langTo];
    const { langTo: targetLangList } = getTranslator(this.vendor);
    const initialReverseLang = langTo !== "en" ? "en" : Object.keys(targetLangList).filter(lang => lang !== "auto")[0] /*first*/;

    if (settingsStore.data.langToReverse) {
      return (
        <>
          <Icon small material="arrow_forward"/>
          <ReactSelect<string>
            className="Select"
            placeholder={getMessage("reverse_translate_select_placeholder")}
            value={this.reverseLanguageOptions.find(opt => opt.value === settingsStore.data.langToReverse)}
            options={this.reverseLanguageOptions}
            onChange={opt => this.setReverseTranslateLanguage(opt.value)}
            formatOptionLabel={({ label, value: lang }) => this.formatLanguageLabel({ lang, title: label })}
          />
          <Icon
            small
            material="clear"
            tooltip={getMessage("reverse_translate_delete_action")}
            onClick={() => this.setReverseTranslateLanguage("")}
          />
        </>
      )
    }

    return (
      <Icon
        small
        material="arrow_forward"
        tooltip={getMessage("reverse_translate_add_action", { lang: langToTitle })}
        onClick={() => this.setReverseTranslateLanguage(initialReverseLang)}
      />
    );
  }

  render() {
    var { langFrom, langTo } = this;
    var { className, showInfoIcon } = this.props;

    const sourceLang = this.sourceLanguageOptions
      .flatMap(group => group.options)
      .find(({ value: lang }) => lang == langFrom);

    const targetLang = this.targetLanguageOptions
      .flatMap(group => group.options)
      .find(({ value: lang }) => lang == langTo);

    return (
      <div className={cssNames("SelectLanguage flex gaps align-center", className)}>
        <ReactSelect<string>
          // menuIsOpen={true}
          className="Select"
          placeholder={getMessage("source_lang_placeholder")}
          value={sourceLang}
          options={this.sourceLanguageOptions}
          onChange={(opt) => this.onChange({ sourceLang: opt.value })}
          formatOptionLabel={({ label, value: lang }) => this.formatLanguageLabel({
            lang, sourceType: "source", title: label,
          })}
        />

        <Icon
          material="swap_horiz"
          className="swap-icon"
          tooltip={getMessage("swap_languages")}
          onClick={this.onSwap}
        />

        <ReactSelect<string>
          // menuIsOpen={true}
          className="Select"
          placeholder={getMessage("target_lang_placeholder")}
          value={targetLang}
          options={this.targetLanguageOptions}
          onChange={opt => this.onChange({ targetLang: opt.value })}
          formatOptionLabel={({ label, value: lang }) => this.formatLanguageLabel({
            lang, sourceType: "target", title: label,
          })}
        />

        {this.renderReverseTranslationSettingsPanel()}

        {showInfoIcon && (
          <Icon
            small
            material="info_outline"
            tooltip={
              getMessage("favorites_info_tooltip", { hotkey: "Cmd / Alt+Shift" })
            }/>
        )}
      </div>
    );
  }
}

// Mapping language to flag icon in "flag-icons" package
export const langToFlagIconMap: Record<string, string> = {
  "sq": "al", // Albanian
  "hy": "am", // Armenian
  "ce": "ph", // Cebuano (Philippines)
  "bn": "bd", // Bengali (Bangladesh)
  "ny": "mw", // Malawi, Zambia, Mozambique, Zimbabwe
  "cs": "cz", // Czech Republic
  "da": "dk", // Danish
  "en": "gb", // English
  "el": "gr", // Greek
  "ka": "ge", // Georgian
  "ha": "ne", // Hausa (West Africa)
  "haw": "hm", // Hawaiian
  "hi": "in", // Hindi (India)
  "te": "in", // Telugu (India)
  "tg": "tj", // Tajik (Tajikistan)
  "ur": "pk", // Urdu (Pakistan)
  "ja": "jp", // Japanese
  "ko": "kr", // Korean
  "lo": "la", // Laos
  "uk": "ua", // Ukrainian
  "fa": "ir", // Iran (Persian)
  "ku": "iq", // Iraq, Kurdistan Region
  "ma": "nz", // Maori (New Zealand)
  "sw": "ke", // Swahili (Kenya, Rwanda, Tanzania, Uganda)
  "zh-CN": "cn", // Chinese (Simplified)
  "zh-TW": "tw", // Chinese (Taiwan)
  "yo": "ng", // Yoruba (Nigeria)
  "zu": "za", // Zulu (South Africa)
  "xh": "za", // Xhosa (South Africa)
  "vi": "vn", // Vietnamese
};

export function getFlagIcon(locale: string): string | undefined {
  try {
    const langIconFile = langToFlagIconMap[locale] ?? locale;
    return require(`flag-icons/flags/4x3/${langIconFile}.svg`);
  } catch (error) {
    return undefined; // noop
  }
}
