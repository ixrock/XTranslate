import "./settings.scss";

import * as React from "react";
import { observer } from "mobx-react";
import { getTranslators } from "../../vendors";
import { __i18n, createTab } from "../../extension";
import { autobind, getHotkey, parseHotkey } from "../../utils";
import { SelectLanguage } from "../select-language";
import { Input, NumberInput } from "../input";
import { Checkbox } from "../checkbox";
import { Radio, RadioGroup } from "../radio";
import { Option, Select } from "../select";
import { Icon } from "../icon";
import { settingsStore } from "./settings.store";
import { Button } from "../button";
import { Tooltip } from "../tooltip";

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

  render() {
    var { settings } = this;
    var hotKey = parseHotkey(settings.hotkey);
    return (
      <div className="Settings flex column gaps">
        <p className="sub-title">{__i18n("setting_title_common")}</p>
        <div className="checkbox-group">
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

        <p className="sub-title">{__i18n("setting_title_translator_service")}</p>
        <div className="vendors flex gaps">
          <RadioGroup
            className="vendor flex gaps column"
            value={settings.vendor}
            onChange={v => settingsStore.setVendor(v)}
            children={
              getTranslators().map(({ name, title, publicUrl }) => {
                var domain = publicUrl.match(/https?:\/\/(.*?)(?:\/\w*|$)/i)[1];
                return (
                  <Radio key={name} value={name}>
                    <div className="label">{title}</div>
                    <a href={publicUrl} target="_blank">
                      {domain.split('.').slice(-2).join('.')}
                    </a>
                  </Radio>
                )
              })
            }
          />
          <SelectLanguage/>
        </div>

        <p className="sub-title">{__i18n("setting_title_popup")}</p>
        <div className="display-options flex gaps auto">
          <div className="checkbox-group">
            <Checkbox
              label={__i18n("show_tts_icon_inside_popup")}
              value={settings.showTextToSpeechIcon}
              onChange={v => settings.showTextToSpeechIcon = v}
            />
            <Checkbox
              label={__i18n("show_next_vendor_icon_in_popup")}
              value={settings.showNextVendorIcon}
              onChange={v => settings.showNextVendorIcon = v}
            />
            <Checkbox
              label={__i18n("show_copy_translation_icon")}
              value={settings.showCopyTranslationIcon}
              onChange={v => settings.showCopyTranslationIcon = v}
            />
          </div>
          <div className="checkbox-group">
            <Checkbox
              label={__i18n("display_popup_after_text_selected")}
              value={settings.showPopupAfterSelection}
              onChange={v => settings.showPopupAfterSelection = v}
            />
            <Checkbox
              label={__i18n("display_popup_on_double_click")}
              value={settings.showPopupOnDoubleClick}
              onChange={v => settings.showPopupOnDoubleClick = v}
            />
            <div className="use-hotkey flex">
              <Checkbox
                className="box grow"
                label={__i18n("display_popup_on_hotkey")}
                value={settings.showPopupOnHotkey}
                onChange={v => settings.showPopupOnHotkey = v}
              />
              <label className="flex gaps">
                <Icon material="keyboard"/>
                <Input
                  readOnly
                  id="hotkey" className="hotkey"
                  value={hotKey.value} onKeyDown={this.saveHotkey}
                />
                <Tooltip htmlFor="hotkey" following>
                  {hotKey.title}
                </Tooltip>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gaps align-center">
          <p>{__i18n("popup_position_title")}</p>
          <Select
            className="box grow"
            value={settings.popupFixedPos}
            onChange={v => settings.popupFixedPos = v}
          >
            <Option value="" label={__i18n("popup_position_auto")}/>
            <Option value="leftTop" label={__i18n("popup_position_left_top")}/>
            <Option value="rightTop" label={__i18n("popup_position_right_top")}/>
            <Option value="leftBottom" label={__i18n("popup_position_left_bottom")}/>
            <Option value="rightBottom" label={__i18n("popup_position_right_bottom")}/>
          </Select>
        </div>

        <p className="sub-title">{__i18n("setting_title_text_input")}</p>
        <div className="display-options flex gaps auto">
          <div className="flex column gaps align-flex-start">
            <Checkbox
              label={__i18n("remember_last_typed_text")}
              value={settings.rememberLastText}
              onChange={v => settings.rememberLastText = v}
            />
            <Button
              outline
              id="add-shortcut"
              className="box flex gaps"
              label={__i18n("sub_header_quick_access_hotkey")}
              onClick={() => createTab("chrome://extensions/configureCommands")}
            />
            <Tooltip htmlFor="add-shortcut" following nowrap={false}>
              {__i18n("quick_access_configure_link")}
            </Tooltip>
          </div>
          <div className="translate-delay">
            <div className="flex gaps">
              <p>{__i18n("translation_delay")}</p>
              <NumberInput
                className="box grow"
                min={0} max={10000} step={50}
                value={settings.textInputTranslateDelayMs}
                onChange={v => settings.textInputTranslateDelayMs = v}
              />
            </div>
            <small>{__i18n("translation_delay_info")}</small>
          </div>
        </div>
      </div>
    );
  }
}
