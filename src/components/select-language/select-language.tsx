import "./select-language.scss";

import * as React from 'react';
import { observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { getVendorByName } from '../../vendors';
import { autobind, cssNames, noop } from "../../utils";
import { Option, Select } from "../select";
import { Icon } from "../icon";
import { settingsStore } from "../settings/settings.store";

interface Props {
  className?: string;
  onSwap?(langFrom: string, langTo: string): void;
  onChange?(langFrom: string, langTo: string): void;
}

@observer
export class SelectLanguage extends React.Component<Props, {}> {
  settings = settingsStore.data;

  static defaultProps: Props = {
    onSwap: noop,
    onChange: noop,
  };

  @autobind()
  swapLanguages() {
    var { langFrom, langTo } = this.settings;
    if (langFrom === 'auto') return;
    this.settings.langFrom = langTo;
    this.settings.langTo = langFrom;
    this.props.onSwap(langTo, langFrom);
  }

  @autobind()
  onChangeLangFrom(langFrom) {
    this.settings.langFrom = langFrom;
    this.props.onChange(langFrom, null);
  }

  @autobind()
  onChangeLangTo(langTo) {
    this.settings.langTo = langTo;
    this.props.onChange(null, langTo);
  }

  render() {
    var { vendor, langFrom, langTo } = this.settings;
    var { langFrom: listFrom, langTo: listTo } = getVendorByName(vendor);
    var className = cssNames('SelectLanguage flex gaps align-flex-start', this.props.className);
    return (
      <div className={className}>
        <Select value={langFrom} onChange={this.onChangeLangFrom}>
          {Object.keys(listFrom).map(lang => (
            <Option key={lang} value={lang} disabled={lang === langTo} label={listFrom[lang]}/>
          ))}
        </Select>
        <Icon
          material="swap_horiz"
          className="swap-icon"
          title={__i18n("swap_languages")}
          onClick={this.swapLanguages}
        />
        <Select value={langTo} onChange={this.onChangeLangTo}>
          {Object.keys(listTo).map(lang => (
            <Option key={lang} value={lang} disabled={lang === langFrom} label={listTo[lang]}/>
          ))}
        </Select>
      </div>
    );
  }
}
