import "./select-language.scss";

import React from "react";
import { action } from "mobx";
import { ReactSelect, ReactSelectGroup, ReactSelectOption } from "../select";
import { cssNames } from "../../utils";
import { getTranslator, ProviderCodeName } from "../../providers";
import { getMessage } from "../../i18n";
import { Icon } from "../icon";
import { FavoriteLangDirection, settingsStore } from "../settings/settings.storage";
import { getFlagIcon } from "./flag-icons";

export interface SelectLanguageProps {
  provider: ProviderCodeName;
  from: string;
  to: string;
  className?: string;
  showInfoIcon?: boolean;
  showReverseTranslation?: boolean;
  onChange(update: SelectLanguageChangeEvent): void;
}

export interface SelectLanguageChangeEvent {
  langFrom: string;
  langTo: string;
}

export class SelectLanguage extends React.Component<SelectLanguageProps> {
  get sourceFavorites(): string[] {
    return settingsStore.getFavorites(this.props.provider, "source")
  }

  get targetFavorites(): string[] {
    return settingsStore.getFavorites(this.props.provider, "target")
  }

  get sourceLanguageOptions(): ReactSelectGroup<string>[] {
    const { from, to, provider } = this.props;
    const { langFrom: sourceLangList } = getTranslator(provider);

    const getOption = (lang: string): ReactSelectOption<string> => {
      return {
        value: lang,
        isDisabled: lang == to,
        isSelected: lang == from,
        label: sourceLangList[lang],
      }
    };

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

  get targetLanguageOptions(): ReactSelectGroup<string>[] {
    const { from, to, provider } = this.props;
    const { langTo: targetLangList } = getTranslator(provider);

    const getOption = (lang: string): ReactSelectOption<string> => {
      return {
        value: lang,
        isDisabled: lang == from,
        isSelected: lang == to,
        label: targetLangList[lang],
      }
    };

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

  get reverseLanguageOptions(): ReactSelectOption<string>[] {
    const { to: langTo, provider } = this.props;
    const { langToReverse } = settingsStore.data;
    const { langTo: targetLangList } = getTranslator(provider);

    const getOption = (lang: string): ReactSelectOption<string> => {
      return {
        value: lang,
        isDisabled: lang == langTo,
        isSelected: lang == langToReverse,
        label: targetLangList[lang],
      }
    };

    return Object.keys(targetLangList).map(getOption);
  }

  @action
  private onSwap = () => {
    const { from, to } = this.props;
    if (from === "auto") return; // not possible translate to "auto"
    this.onChange({ sourceLang: to, targetLang: from });
  }

  @action
  private onChange = (update: { sourceLang?: string, targetLang?: string } = {}) => {
    const { from, to, onChange } = this.props;
    const { sourceLang = from, targetLang = to } = update;
    onChange({ langFrom: sourceLang, langTo: targetLang });
  }

  @action
  toggleFavorite = (evt: React.MouseEvent, lang: string, sourceType: FavoriteLangDirection) => {
    const isAutoDetect = lang == "auto"
    const isToggleAction = evt.metaKey || (evt.altKey && evt.shiftKey);
    if (isAutoDetect || !isToggleAction) return; // skip: normal select

    // save updated favorite to storage
    settingsStore.toggleFavorite({
      provider: this.props.provider,
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
  private setReverseTranslateLanguage(lang: string) {
    settingsStore.data.langToReverse = lang;
  }

  renderReverseTranslationSettingsPanel() {
    const { to: langTo, provider } = this.props;
    const langToTitle = getTranslator(provider).langTo[langTo];
    const { langTo: targetLangList } = getTranslator(provider);
    const initialReverseLang = langTo !== "en" ? "en" : Object.keys(targetLangList).filter(lang => lang !== "auto")[0] /*first*/;

    if (settingsStore.data.langToReverse) {
      return (
        <>
          <Icon small material="arrow_forward"/>
          <ReactSelect
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
    const {
      className, showInfoIcon, showReverseTranslation,
      from: langFrom,
      to: langTo,
    } = this.props;

    const sourceLang = this.sourceLanguageOptions
      .flatMap(group => group.options)
      .find(({ value: lang }) => lang == langFrom);

    const targetLang = this.targetLanguageOptions
      .flatMap(group => group.options)
      .find(({ value: lang }) => lang == langTo);

    return (
      <div className={cssNames("SelectLanguage flex gaps align-center", className)}>
        <ReactSelect
          className="Select"
          menuPlacement="top"
          placeholder={getMessage("source_lang_placeholder")}
          value={sourceLang}
          options={this.sourceLanguageOptions}
          onChange={(opt) => this.onChange({ sourceLang: opt.value })}
          formatOptionLabel={({ label: title, value: lang }) => this.formatLanguageLabel({ lang, title, sourceType: "source" })}
        />

        <Icon
          material="swap_horiz"
          className="swap-icon"
          tooltip={getMessage("swap_languages")}
          onClick={this.onSwap}
        />

        <ReactSelect
          className="Select"
          menuPlacement="top"
          placeholder={getMessage("target_lang_placeholder")}
          value={targetLang}
          options={this.targetLanguageOptions}
          onChange={opt => this.onChange({ targetLang: opt.value })}
          formatOptionLabel={({ label: title, value: lang }) => this.formatLanguageLabel({ lang, title, sourceType: "target" })}
        />

        {showReverseTranslation && this.renderReverseTranslationSettingsPanel()}
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
