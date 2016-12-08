require('./select-language.scss');
import * as React from 'react';
import { __i18n } from "../../extension/i18n";
import { vendors } from '../../vendors';
import { autobind } from "core-decorators";
import { cssNames } from "../../utils";
import { Select, SelectProps, Option, MaterialIcon } from '../ui'
import omit = require("lodash/omit");

interface Props extends React.HTMLProps<any> {
  vendor: string
  from: SelectProps
  to: SelectProps
}

export class SelectLanguage extends React.Component<Props, {}> {
  private fromLang: Select;
  private toLang: Select;

  get vendor() {
    return vendors[this.props.vendor];
  }

  @autobind()
  swapLanguages() {
    var fromLang = this.props.from.value;
    var toLang = this.props.to.value;
    if (fromLang === 'auto') return;
    this.fromLang.value = toLang;
    this.toLang.value = fromLang;
  }

  render() {
    var listFrom = this.vendor.langFrom;
    var listTo = this.vendor.langTo;
    var fromLang = this.props.from;
    var toLang = this.props.to;
    var className = cssNames('SelectLanguage flex align-center', this.props.className);
    return (
        <div className={className}>
          <Select {...fromLang} className="box grow" ref={e => this.fromLang = e}>
            {Object.keys(listFrom).map(lang => (
                <Option key={lang} value={lang}
                        disabled={lang === toLang.value}
                        title={listFrom[lang]}/>
            ))}
          </Select>
          <MaterialIcon
              name="swap_horiz" title={__i18n("swap_languages")}
              className="swap-icon mh1" onClick={this.swapLanguages}/>
          <Select {...toLang} className="box grow" ref={e => this.toLang = e}>
            {Object.keys(listTo).map(lang => (
                <Option key={lang} value={lang}
                        disabled={lang === fromLang.value}
                        title={listTo[lang]}/>
            ))}
          </Select>
        </div>
    );
  }
}

export default SelectLanguage;