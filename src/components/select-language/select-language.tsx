import "./select-language.scss";

import * as React from 'react';
import { observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { getVendorByName } from '../../vendors';
import { cssNames, noop, autobind } from "../../utils";
import { Option, Select } from "../select";
import { MaterialIcon } from "../icons";
import { settingsStore } from "../settings/settings.store";

interface Props extends React.HTMLProps<any> {
  onSwapLang?(langFrom: string, langTo: string): void;
  onChangeLang?(langFrom: string, langTo: string): void;
}

@observer
export class SelectLanguage extends React.Component<Props, {}> {
  settings = settingsStore.data;

  static defaultProps: Props = {
    onSwapLang: noop,
    onChangeLang: noop,
  };

  @autobind()
  swapLanguages() {
    var { langFrom, langTo } = this.settings;
    if (langFrom === 'auto') return;
    this.settings.langFrom = langTo;
    this.settings.langTo = langFrom;
    this.props.onSwapLang(langTo, langFrom);
  }

  @autobind()
  onChangeLangFrom(langFrom) {
    this.settings.langFrom = langFrom;
    this.props.onChangeLang(langFrom, null);
  }

  @autobind()
  onChangeLangTo(langTo) {
    this.settings.langTo = langTo;
    this.props.onChangeLang(null, langTo);
  }

  render() {
    var { vendor, langFrom, langTo } = this.settings;
    var { langFrom: listFrom, langTo: listTo } = getVendorByName(vendor);
    var className = cssNames('SelectLanguage flex align-flex-start', this.props.className);
    return (
      <div className={className}>
        <Select value={langFrom} onChange={this.onChangeLangFrom}>
          {Object.keys(listFrom).map(lang => (
            <Option key={lang} value={lang} disabled={lang === langTo} title={listFrom[lang]}/>
          ))}
        </Select>
        <MaterialIcon
          name="swap_horiz" title={__i18n("swap_languages")}
          className="swap-icon mh1" onClick={this.swapLanguages}/>
        <Select value={langTo} onChange={this.onChangeLangTo}>
          {Object.keys(listTo).map(lang => (
            <Option key={lang} value={lang} disabled={lang === langFrom} title={listTo[lang]}/>
          ))}
        </Select>
      </div>
    );
  }
}
