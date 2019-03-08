import "./select-language.scss";

import * as React from 'react';
import { observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { getTranslatorByName } from "../../vendors";
import { cssNames } from "../../utils";
import { Option, Select } from "../select";
import { Icon } from "../icon";
import { settingsStore } from "../settings/settings.store";

interface Props {
  className?: string;
  vendor?: string;
  from?: string;
  to?: string;
  onChange?(langFrom: string, langTo: string): void;
}

@observer
export class SelectLanguage extends React.Component<Props> {
  settings = settingsStore.data;

  get langFrom() {
    return this.props.from || this.settings.langFrom;
  }

  get langTo() {
    return this.props.to || this.settings.langTo;
  }

  get vendor() {
    return this.props.vendor || this.settings.vendor;
  }

  swap = () => {
    if (this.langFrom === 'auto') return;
    this.onChange(this.langTo, this.langFrom);
  }

  onChange = (langFrom: string, langTo: string) => {
    if (this.props.onChange) {
      this.props.onChange(langFrom, langTo)
    }
    else {
      this.settings.langFrom = langFrom;
      this.settings.langTo = langTo;
    }
  }

  render() {
    var { vendor, langFrom, langTo, onChange } = this;
    var { langFrom: listFrom, langTo: listTo } = getTranslatorByName(vendor);
    var className = cssNames('SelectLanguage flex gaps align-flex-start', this.props.className);
    return (
      <div className={className}>
        <Select value={langFrom} onChange={v => onChange(v, langTo)}>
          {Object.keys(listFrom).map(lang => (
            <Option key={lang} value={lang} disabled={lang === langTo} label={listFrom[lang]}/>
          ))}
        </Select>
        <Icon
          material="swap_horiz"
          className="swap-icon"
          title={__i18n("swap_languages")}
          onClick={this.swap}
        />
        <Select value={langTo} onChange={v => onChange(langFrom, v)}>
          {Object.keys(listTo).map(lang => (
            <Option key={lang} value={lang} disabled={lang === langFrom} label={listTo[lang]}/>
          ))}
        </Select>
      </div>
    );
  }
}
