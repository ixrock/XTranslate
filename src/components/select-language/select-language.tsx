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
      label: sourceLangList[lang],
      isDisabled: lang == this.langTo,
    }));
  }

  @computed get targetLanguageOptions() {
    var { langTo: targetLangList } = getTranslator(this.vendor);

    return Object.keys(targetLangList).map(lang => ({
      value: lang,
      label: targetLangList[lang],
      isDisabled: lang == this.langFrom,
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
      targetLang = this.langFrom,
    } = update;

    if (this.props.onChange) {
      this.props.onChange({ langFrom: sourceLang, langTo: targetLang })
    } else {
      settingsStore.data.langFrom = sourceLang;
      settingsStore.data.langTo = targetLang;
    }
  }

  render() {
    var { langFrom, langTo } = this;
    var className = cssNames("SelectLanguage flex gaps align-center", this.props.className);
    return (
      <div className={className}>
        <ReactSelect
          placeholder="Source language"
          className="Select"
          value={this.sourceLanguageOptions.find(opt => opt.value == langFrom)}
          options={this.sourceLanguageOptions}
          onChange={opt => this.onChange({ sourceLang: opt.value })}
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
        />
      </div>
    );
  }
}
