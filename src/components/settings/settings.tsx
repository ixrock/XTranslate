import "./settings.scss";
import * as React from "react";
import { autobind } from "core-decorators";
import { getVendor, vendors } from "../../vendors";
import { __i18n, tabs } from "../../extension";
import { connect } from "../../store/connect";
import { getHotkey, parseHotkey, prevDefault } from "../../utils";
import { Checkbox, MaterialIcon, Option, Radio, RadioGroup, Select, TextField } from "../ui";
import { SelectLanguage } from "../select-language";
import { ISettingsState, settingsActions } from "./index";

interface Props {
  settings?: ISettingsState
}

@connect(store => ({ settings: store.settings }))
export class Settings extends React.Component<Props, {}> {
  private hotkey: TextField;

  save(settings: ISettingsState) {
    settingsActions.sync(settings);
  }

  @autobind()
  defineHotkey(e: React.KeyboardEvent<any>) {
    var nativeEvent = e.nativeEvent as KeyboardEvent;
    var hotkey = parseHotkey(nativeEvent);
    if (hotkey.code) {
      this.save({ hotkey: getHotkey(nativeEvent) });
    }
  }

  @autobind()
  onVendorChange(vendorName: string) {
    var vendor = getVendor(vendorName);
    var settings: ISettingsState = { vendor: vendorName };
    var { langFrom, langTo } = this.props.settings;
    if (!vendor.langFrom[langFrom]) settings.langFrom = Object.keys(vendor.langFrom)[0];
    if (!vendor.langTo[langTo]) settings.langTo = Object.keys(vendor.langTo)[0];
    this.save(settings);
  }

  render() {
    var settings = this.props.settings;
    var hotkey = parseHotkey(settings.hotkey);
    return (
      <div className="Settings">
        <p className="sub-title">{__i18n("setting_title_common")}</p>
        <div className="display-options flex wrap">
          <Checkbox
            label={__i18n("auto_play_tts")}
            checked={settings.autoPlayText}
            onChange={v => this.save({ autoPlayText: v })}/>
          <Checkbox
            label={__i18n("show_context_menu")}
            checked={settings.showInContextMenu}
            onChange={v => this.save({ showInContextMenu: v })}/>
          <Checkbox
            label={__i18n("display_icon_near_selection")}
            checked={settings.showIconNearSelection}
            onChange={v => this.save({ showIconNearSelection: v })}/>
        </div>

        <p className="sub-title mt2">{__i18n("sub_header_translator")}</p>
        <div className="vendors flex gaps">
          <RadioGroup
            className="vendor flex gaps column"
            value={settings.vendor} onChange={this.onVendorChange}>
            {vendors.map((vendor, i) => {
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
          <SelectLanguage className="box grow"/>
        </div>

        <p className="sub-title mt2">{__i18n("setting_title_popup")}</p>
        <div className="display-options flex wrap">
          <Checkbox
            label={__i18n("show_tts_icon_inside_popup")}
            checked={settings.showTextToSpeechIcon}
            onChange={v => this.save({ showTextToSpeechIcon: v })}/>
          <Checkbox
            label={__i18n("show_next_vendor_icon_in_popup")}
            checked={settings.showNextVendorIcon}
            onChange={v => this.save({ showNextVendorIcon: v })}/>
          <Checkbox
            label={__i18n("show_copy_translation_icon")}
            checked={settings.showCopyTranslationIcon}
            onChange={v => this.save({ showCopyTranslationIcon: v })}/>
          <Checkbox
            label={__i18n("display_popup_after_text_selected")}
            checked={settings.showPopupAfterSelection}
            onChange={v => this.save({ showPopupAfterSelection: v })}/>
          <Checkbox
            label={__i18n("display_popup_on_double_click")}
            checked={settings.showPopupOnDoubleClick}
            onChange={v => this.save({ showPopupOnDoubleClick: v })}/>
          <Checkbox
            label={__i18n("display_popup_on_hotkey")}
            checked={settings.showPopupOnHotkey}
            onChange={v => this.save({ showPopupOnHotkey: v })}>
            <div className="flex center pl1">
              <label htmlFor="hotkey">
                <MaterialIcon name="keyboard"/>
              </label>
              <TextField
                id="hotkey" className="hotkey"
                value={hotkey.value} title={hotkey.title}
                readOnly onKeyDown={this.defineHotkey}
                ref={e => this.hotkey = e}
              />
            </div>
          </Checkbox>
        </div>

        <div className="flex gaps">
          <p>{__i18n("popup_position_title")}</p>
          <Select className="box grow" value={settings.popupFixedPos} onChange={v => this.save({ popupFixedPos: v })}>
            <Option value="" title={__i18n("popup_position_auto")}/>
            <Option value="leftTop" title={__i18n("popup_position_left_top")}/>
            <Option value="rightTop" title={__i18n("popup_position_right_top")}/>
            <Option value="leftBottom" title={__i18n("popup_position_left_bottom")}/>
            <Option value="rightBottom" title={__i18n("popup_position_right_bottom")}/>
          </Select>
        </div>

        <p className="sub-title mt2">{__i18n("setting_title_text_input")}</p>
        <div className="display-options flex wrap">
          <Checkbox
            label={__i18n("remember_last_typed_text")}
            checked={settings.rememberLastText}
            onChange={v => this.save({ rememberLastText: v })}/>
        </div>

        <div className="text-input-hotkey mt2">
          <p className="sub-title">{__i18n("sub_header_quick_access")}</p>
          <a href="#" onClick={prevDefault(() => tabs.open("chrome://extensions/configureCommands"))}>
            {__i18n("quick_access_configure_link")}
          </a>
        </div>
      </div>
    );
  }
}
