import "./select-language.scss";

import React from "react";
import ReactSelect, { Props as ReactSelectProps } from "react-select";
import { action, computed, makeObservable } from "mobx";
import { observer } from "mobx-react";
import { cssNames } from "../../utils";
import { getTranslator } from "../../vendors";
import { getMessage } from "../../i18n";
import { Icon } from "../icon";
import { settingsStore } from "../settings/settings.storage";

export interface Props extends Omit<ReactSelectProps, "onChange"> {
  className?: string;
  vendor?: string;
  from?: string;
  to?: string;
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

  @computed get sourceLanguageOptions() {
    var { langFrom: sourceLangList } = getTranslator(this.vendor);

    return Object.keys(sourceLangList).map(lang => ({
      value: lang,
      isDisabled: lang == this.langTo,
      label: sourceLangList[lang],
    }));
  }

  @computed get targetLanguageOptions() {
    var { langTo: targetLangList } = getTranslator(this.vendor);

    return Object.keys(targetLangList).map(lang => ({
      value: lang,
      isDisabled: lang == this.langFrom,
      label: targetLangList[lang],
    }));
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

  renderIcon(countryCode: string): React.ReactNode {
    let flagIconPath: string;
    try {
      flagIconPath = require(`flag-icons/flags/4x3/${countryCode}.svg`);
    } catch (e) {
      return null;
    }
    return (
      <img className="country-icon" src={flagIconPath} alt=""/>
    );
  }

  // TODO: save favorites to settings storage
  toggleFavorite = (evt: React.MouseEvent, opts: { lang: string, sourceType: "source" | "target" }) => {
    console.log('CLICKED', {
      event: evt,
      vendor: this.vendor, // save favorites per service-provider
    });

    if (evt.metaKey || (evt.altKey && evt.shiftKey)) {
      console.log(`TOGGLE FAVORITE: ${opts.lang} (${opts.sourceType} languages list)`);
    }
  }

  formatLanguageLabel(opts: { lang: string, title: string, sourceType: "source" | "target" }): React.ReactNode {
    return (
      <div
        className={cssNames("language flex gaps align-center", opts.lang)}
        onClick={evt => this.toggleFavorite(evt, opts)}
      >
        {this.renderIcon(opts.lang)}
        <span>{opts.title}</span>
      </div>
    )
  }

  render() {
    var { langFrom, langTo } = this;
    var className = cssNames("SelectLanguage flex gaps align-center", this.props.className);
    return (
      <div className={className}>
        <ReactSelect
          // menuIsOpen={true}
          placeholder="Source language"
          className="Select"
          value={this.sourceLanguageOptions.find(opt => opt.value == langFrom)}
          options={this.sourceLanguageOptions}
          onChange={opt => this.onChange({ sourceLang: opt.value })}
          formatOptionLabel={({ label, value: lang }) => this.formatLanguageLabel({
            lang, sourceType: "source", title: label,
          })}
        />
        <Icon
          material="swap_horiz"
          className="swap-icon"
          title={getMessage("swap_languages")}
          onClick={this.onSwap}
        />
        <ReactSelect
          placeholder="Target language"
          className="Select"
          value={this.targetLanguageOptions.find(opt => opt.value == langTo)}
          options={this.targetLanguageOptions}
          onChange={opt => this.onChange({ targetLang: opt.value })}
          formatOptionLabel={({ label, value: lang }) => this.formatLanguageLabel({
            lang, sourceType: "target", title: label,
          })}
        />
      </div>
    );
  }
}
