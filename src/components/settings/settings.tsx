import "./settings.scss";

import * as React from "react";
import { observer } from "mobx-react";
import { getVendorByName, vendors } from "../../vendors";
import { __i18n, createTab } from "../../extension";
import { autobind, getHotkey, parseHotkey, prevDefault } from "../../utils";
import { SelectLanguage } from "../select-language";
import { TextField } from "../text-field";
import { Checkbox } from "../checkbox";
import { Radio, RadioGroup } from "../radio";
import { Option, Select } from "../select";
import { settingsStore } from "./settings.store";
import { Icon } from "../icon";

@observer
export class Settings extends React.Component {
  settings = settingsStore.data;

  @autobind()
  saveHotkey(e: React.KeyboardEvent) {
    var nativeEvent = e.nativeEvent;
    var hotkey = parseHotkey(nativeEvent);
    if (hotkey.code) {
      this.settings.hotkey = getHotkey(nativeEvent);
    }
  }

  @autobind()
  onVendorChange(vendorName: string) {
    this.settings.vendor = vendorName;
    var { langFrom, langTo } = this.settings;
    var vendor = getVendorByName(vendorName);
    if (!vendor.langFrom[langFrom]) {
      this.settings.langFrom = Object.keys(vendor.langFrom)[0];
    }
    if (!vendor.langTo[langTo]) {
      this.settings.langTo = Object.keys(vendor.langTo)[0];
    }
  }

  render() {
    var { settings } = this;
    var hotkey = parseHotkey(settings.hotkey);
    return (
      <div className="Settings flex column gaps">
        <p className="sub-title">{__i18n("setting_title_common")}</p>
        <div className="display-options flex column">
          <Checkbox
            label={__i18n("auto_play_tts")}
            value={settings.autoPlayText}
            onChange={v => settings.autoPlayText = v}
          />
          <Checkbox
            label={__i18n("show_context_menu")}
            value={settings.showInContextMenu}
            onChange={v => settings.showInContextMenu = v}
          />
          <Checkbox
            label={__i18n("display_icon_near_selection")}
            value={settings.showIconNearSelection}
            onChange={v => settings.showIconNearSelection = v}
          />
        </div>

        <p className="sub-title">{__i18n("sub_header_translator")}</p>
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

        <p className="sub-title">{__i18n("setting_title_popup")}</p>
        <div className="display-options flex gaps auto">
          <div className="box">
            <Checkbox
              label={__i18n("show_tts_icon_inside_popup")}
              value={settings.showTextToSpeechIcon}
              onChange={v => settings.showTextToSpeechIcon = v}/>
            <Checkbox
              label={__i18n("show_next_vendor_icon_in_popup")}
              value={settings.showNextVendorIcon}
              onChange={v => settings.showNextVendorIcon = v}/>
            <Checkbox
              label={__i18n("show_copy_translation_icon")}
              value={settings.showCopyTranslationIcon}
              onChange={v => settings.showCopyTranslationIcon = v}/>
          </div>
          <div className="box">
            <Checkbox
              label={__i18n("display_popup_after_text_selected")}
              value={settings.showPopupAfterSelection}
              onChange={v => settings.showPopupAfterSelection = v}/>
            <Checkbox
              label={__i18n("display_popup_on_double_click")}
              value={settings.showPopupOnDoubleClick}
              onChange={v => settings.showPopupOnDoubleClick = v}/>
            <Checkbox
              label={__i18n("display_popup_on_hotkey")}
              value={settings.showPopupOnHotkey}
              onChange={v => settings.showPopupOnHotkey = v}>
              <div className="flex center">
                <label htmlFor="hotkey">
                  <Icon material="keyboard"/>
                </label>
                <TextField
                  readOnly className="hotkey"
                  title={hotkey.title}
                  value={hotkey.value}
                  onKeyDown={this.saveHotkey}
                />
              </div>
            </Checkbox>
          </div>
        </div>

        <div className="flex gaps">
          <p>{__i18n("popup_position_title")}</p>
          <Select className="box grow"
                  value={settings.popupFixedPos}
                  onChange={v => settings.popupFixedPos = v}>
            <Option value="" title={__i18n("popup_position_auto")}/>
            <Option value="leftTop" title={__i18n("popup_position_left_top")}/>
            <Option value="rightTop" title={__i18n("popup_position_right_top")}/>
            <Option value="leftBottom" title={__i18n("popup_position_left_bottom")}/>
            <Option value="rightBottom" title={__i18n("popup_position_right_bottom")}/>
          </Select>
        </div>

        <p className="sub-title">{__i18n("setting_title_text_input")}</p>
        <div className="display-options flex gaps align-flex-start">
          <Checkbox
            label={__i18n("remember_last_typed_text")}
            value={settings.rememberLastText}
            onChange={v => settings.rememberLastText = v}
          />
          <div className="translate-delay">
            <div className="flex gaps">
              <p>{__i18n("translation_delay")}</p>
              <TextField
                type="number" min={0} max={10000} step={50}
                showErrors={false} className="box grow"
                value={settings.textInputTranslateDelayMs}
                onChange={v => settings.textInputTranslateDelayMs = v}
              />
            </div>
            <small>{__i18n("translation_delay_info")}</small>
          </div>
        </div>

        <div className="text-input-hotkey flex column gaps">
          <p className="sub-title">{__i18n("sub_header_quick_access")}</p>
          <a href="#" onClick={prevDefault(() => createTab("chrome://extensions/configureCommands"))}>
            {__i18n("quick_access_configure_link")}
          </a>
        </div>
      </div>
    );
  }
}
