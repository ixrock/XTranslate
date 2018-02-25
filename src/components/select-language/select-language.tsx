import "./select-language.scss";
import * as React from 'react';
import { __i18n } from "../../extension/i18n";
import { vendors } from '../../vendors';
import { autobind } from "core-decorators";
import { connect } from "../../store/connect";
import { Select, Option, MaterialIcon } from '../ui'
import { ISettingsState, settingsActions } from "../settings";
import { cssNames, noop } from "../../utils";

type Props = React.HTMLProps<any> & {
  settings?: ISettingsState
  onSwapLang?(langFrom: string, langTo: string): void;
  onChangeLang?(langFrom: string, langTo: string): void;
}

@connect(store => ({
  settings: store.settings
}))
export class SelectLanguage extends React.Component<Props, {}> {
  static defaultProps = {
    onSwapLang: noop,
    onChangeLang: noop,
  };

  @autobind()
  swapLanguages() {
    var { langFrom, langTo } = this.props.settings;
    if (langFrom === 'auto') return;
    var sync = settingsActions.sync({ langFrom: langTo, langTo: langFrom });
    sync.then(() => this.props.onSwapLang(langTo, langFrom)).catch(noop);
  }

  @autobind()
  onChangeLangFrom(langFrom) {
    settingsActions.sync({ langFrom });
    this.props.onChangeLang(langFrom, null);
  }

  @autobind()
  onChangeLangTo(langTo) {
    settingsActions.sync({ langTo });
    this.props.onChangeLang(null, langTo);
  }

  render() {
    var { vendor, langFrom, langTo } = this.props.settings;
    var listFrom = vendors[vendor].langFrom;
    var listTo = vendors[vendor].langTo;
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
