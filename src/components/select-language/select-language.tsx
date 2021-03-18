import "./select-language.scss";

import * as React from 'react';
import { observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { getTranslator } from "../../vendors";
import { cssNames } from "../../utils";
import { Option, Select } from "../select";
import { Icon } from "../icon";
import { settingsStore } from "../settings/settings.storage";

interface Props {
  className?: string;
  vendor?: string;
  from?: string;
  to?: string;
  onChange?(langFrom: string, langTo: string): void;
}

@observer
export class SelectLanguage extends React.Component<Props> {
  get langFrom() {
    var { from: langFrom } = this.props;
    return langFrom || settingsStore.data.langFrom;
  }

  get langTo() {
    var { to: langTo } = this.props;
    return langTo || settingsStore.data.langTo;
  }

  get vendor() {
    var { vendor } = this.props;
    return vendor || settingsStore.data.vendor;
  }

  swap = () => {
    if (this.langFrom === "auto") return;
    this.onChange(this.langTo, this.langFrom);
  }

  onChange = (langFrom: string, langTo: string) => {
    var { onChange } = this.props;
    if (onChange) {
      onChange(langFrom, langTo)
    }
    else {
      settingsStore.data.langFrom = langFrom;
      settingsStore.data.langTo = langTo;
    }
  }

  render() {
    var { vendor, langFrom, langTo, onChange } = this;
    var { langFrom: listFrom, langTo: listTo } = getTranslator(vendor);
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
