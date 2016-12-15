require('./settings.scss');
import * as React from 'react';
import { __i18n } from "../../extension/i18n";
import { autobind, debounce } from "core-decorators";
import { vendors, vendorsList } from '../../vendors';
import { connect } from "../../store/connect";
import { parseHotkey, getHotkey } from '../../utils'
import { Checkbox, TextField, Radio, RadioGroup, MaterialIcon } from '../ui'
import { SelectLanguage } from '../select-language'
import { ISettingsState, settingsActions } from './index'

interface Props {
  settings?: ISettingsState
}

@connect(store => ({ settings: store.settings }))
export class Settings extends React.Component<Props, {}> {
  private hotkey: TextField;

  save(state: ISettingsState) {
    this.setState(state);
    this.sync();
  }

  @debounce(250)
  sync() {
    settingsActions.sync(this.state);
  }

  @autobind()
  defineHotkey(e: React.KeyboardEvent<any>) {
    var nativeEvent = e.nativeEvent as KeyboardEvent;
    var hotkey = parseHotkey(nativeEvent);
    if (hotkey.code) {
      this.hotkey.value = hotkey.value;
      this.save({ hotkey: getHotkey(nativeEvent) });
    }
  }

  @autobind()
  onVendorChange(vendorName: string) {
    var vendor = vendors[vendorName];
    var state: ISettingsState = { vendor: vendorName };
    var { langFrom, langTo } = this.props.settings;
    if (!vendor.langFrom[langFrom]) state.langFrom = Object.keys(vendor.langFrom)[0];
    if (!vendor.langTo[langTo]) state.langTo = Object.keys(vendor.langTo)[0];
    this.save(state);
  }

  render() {
    var settings = Object.assign({}, this.props.settings, this.state);
    var hotkey = parseHotkey(settings.hotkey);
    return (
        <div className="Settings">
          <div className="display-options flex wrap">
            <Checkbox label={__i18n("auto_play_tts")}
                      checked={settings.autoPlayText}
                      onChange={v => this.save({autoPlayText: v})}/>
            <Checkbox label={__i18n("show_tts_icon_inside_popup")}
                      checked={settings.showPlayIcon}
                      onChange={v => this.save({showPlayIcon: v})}/>
            <Checkbox label={__i18n("show_context_menu")}
                      checked={settings.showInContextMenu}
                      onChange={v => this.save({showInContextMenu: v})}/>
            <Checkbox label={__i18n("show_next_vendor_icon_in_popup")}
                      checked={settings.showNextVendorIcon}
                      onChange={v => this.save({showNextVendorIcon: v})}/>
            <Checkbox label={__i18n("display_icon_near_selection")}
                      checked={settings.showIconNearSelection}
                      onChange={v => this.save({showIconNearSelection: v})}/>
            <Checkbox label={__i18n("display_popup_after_text_selected")}
                      checked={settings.showPopupAfterSelection}
                      onChange={v => this.save({showPopupAfterSelection: v})}/>
            <Checkbox label={__i18n("display_popup_on_double_click")}
                      checked={settings.showPopupOnDoubleClick}
                      onChange={v => this.save({showPopupOnDoubleClick: v})}/>
            <Checkbox label={__i18n("display_popup_on_hotkey")}
                      checked={settings.showPopupOnHotkey}
                      onChange={v => this.save({showPopupOnHotkey: v})}>
              <div className="flex center pl1">
                <label htmlFor="hotkey">
                  <MaterialIcon name="keyboard"/>
                </label>
                <TextField id="hotkey"
                           className="hotkey" readOnly={true}
                           title={hotkey.title} value={hotkey.value}
                           onKeyDown={this.defineHotkey} ref={e => this.hotkey = e}/>
              </div>
            </Checkbox>
          </div>

          <div className="vendors flex gaps">
            <div className="vendor">
              <p className="sub-title mb1">{__i18n("sub_header_translator")}</p>
              <RadioGroup name="vendor" value={settings.vendor} onChange={this.onVendorChange}>
                {vendorsList.map((vendor, i) => {
                  var domain = vendor.publicUrl.match(/https?:\/\/(.*?)(?:\/\w*|$)/i)[1];
                  return (
                      <Radio key={i} value={vendor.name}>
                        <div className="label">{vendor.title}</div>
                        <a href={vendor.publicUrl} target="_blank">
                          {domain.split('.').slice(-2).join('.')}
                        </a>
                      </Radio>
                  )
                })};
              </RadioGroup>
            </div>
            <div className="direction box grow pl2">
              <p className="sub-title">{__i18n("sub_header_direction")}</p>
              <SelectLanguage
                  vendor={settings.vendor}
                  from={{value: settings.langFrom, onChange: v => this.save({langFrom: v})}}
                  to={{value: settings.langTo, onChange: v => this.save({langTo: v})}}/>
            </div>
          </div>

          {settings.allowAds ? (
              <div className="support">
                <p className="sub-title pv2">{__i18n("sub_header_support_developers")}</p>
                <Checkbox label={__i18n("support_developers_checkbox")}
                          checked={settings.allowAds}
                          onChange={v => this.save({allowAds: v})}/>
              </div>
          ) : null}
        </div>
    );
  }
}

export default Settings;