import "./settings.scss";

import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";
import { getTranslators } from "../../vendors";
import { __i18n, createTab } from "../../extension";
import { autobind, getHotkey, parseHotkey, prevDefault } from "../../utils";
import { XTranslateIcon } from "../../user-script/xtranslate-icon";
import { SelectLanguage } from "../select-language";
import { Input, NumberInput } from "../input";
import { Checkbox } from "../checkbox";
import { Radio, RadioGroup } from "../radio";
import { Option, Select } from "../select";
import { Icon } from "../icon";
import { Button } from "../button";
import { Popup } from "../popup";
import { TooltipProps } from "../tooltip";
import { settingsStore } from "./settings.store";

@observer
export class Settings extends React.Component {
  @observable appWindowCmd = "";

  componentDidMount() {
    chrome.commands.getAll(commands => {
      var windowAppCmd = commands.find(cmd => cmd.name == "_execute_browser_action");
      if (windowAppCmd) {
        this.appWindowCmd = windowAppCmd.shortcut;
      }
    })
  }

  @autobind()
  saveHotkey(evt: React.KeyboardEvent) {
    var nativeEvent = evt.nativeEvent;
    var hotkey = parseHotkey(nativeEvent);
    if (hotkey.code) {
      settingsStore.data.hotkey = getHotkey(nativeEvent);
    }
  }

  renderPopupPreviewTooltip(): Partial<TooltipProps> {
    return {
      style: { background: "none" },
      children: <Popup preview/>
    }
  }

  render() {
    var { appWindowCmd } = this;
    var settings = settingsStore.data;
    var hotKey = parseHotkey(settings.hotkey);
    return (
      <div className="Settings flex column gaps">
        <div className="common-settings flex gaps auto">
          <div className="checkbox-group">
            <Checkbox
              label={__i18n("auto_play_tts")}
              checked={settings.autoPlayText}
              onChange={v => settings.autoPlayText = v}
            />
            <Checkbox
              label={__i18n("use_chrome_tts")}
              checked={settings.useChromeTtsEngine}
              onChange={v => settings.useChromeTtsEngine = v}
              tooltip={__i18n("use_chrome_tts_tooltip_info")}
            />
          </div>
          <div className="checkbox-group">
            <Checkbox
              label={__i18n("show_context_menu")}
              checked={settings.showInContextMenu}
              onChange={v => settings.showInContextMenu = v}
            />
            <Checkbox
              label={__i18n("display_icon_near_selection")}
              checked={settings.showIconNearSelection}
              onChange={v => settings.showIconNearSelection = v}
              tooltip={<XTranslateIcon preview/>}
            />
          </div>
        </div>

        <p className="sub-title">{__i18n("setting_title_translator_service")}</p>
        <div className="translator-settings flex">
          <RadioGroup
            className="vendors flex gaps column"
            value={settings.vendor}
            onChange={v => settingsStore.setVendor(v)}
          >
            {getTranslators().map(({ name, title, publicUrl }) => {
              var domain = publicUrl.match(/https?:\/\/(.*?)(?:\/\w*|$)/i)[1];
              return (
                <div key={name} className="vendor flex gaps">
                  <Radio value={name} label={title}/>
                  <a href={publicUrl} target="_blank" tabIndex={-1}>
                    {domain.split('.').slice(-2).join('.')}
                  </a>
                </div>
              )
            })}
          </RadioGroup>
          <SelectLanguage/>
        </div>

        <p className="sub-title">{__i18n("setting_title_popup")}</p>
        <div className="popup-settings flex gaps auto">
          <div className="checkbox-group">
            <Checkbox
              label={__i18n("show_tts_icon_inside_popup")}
              checked={settings.showTextToSpeechIcon}
              onChange={v => settings.showTextToSpeechIcon = v}
              tooltip={this.renderPopupPreviewTooltip()}
            />
            <Checkbox
              label={__i18n("show_next_vendor_icon_in_popup")}
              checked={settings.showNextVendorIcon}
              onChange={v => settings.showNextVendorIcon = v}
              tooltip={this.renderPopupPreviewTooltip()}
            />
            <Checkbox
              label={__i18n("show_copy_translation_icon")}
              checked={settings.showCopyTranslationIcon}
              onChange={v => settings.showCopyTranslationIcon = v}
              tooltip={this.renderPopupPreviewTooltip()}
            />
            <Checkbox
              label={__i18n("show_detected_language_block")}
              checked={settings.showTranslatedFrom}
              onChange={v => settings.showTranslatedFrom = v}
              tooltip={this.renderPopupPreviewTooltip()}
            />
          </div>
          <div className="checkbox-group">
            <Checkbox
              label={__i18n("display_popup_after_text_selected")}
              checked={settings.showPopupAfterSelection}
              onChange={v => settings.showPopupAfterSelection = v}
            />
            <Checkbox
              label={__i18n("display_on_click_by_selected_text")}
              checked={settings.showPopupOnClickBySelection}
              onChange={v => settings.showPopupOnClickBySelection = v}
            />
            <Checkbox
              label={__i18n("display_popup_on_double_click")}
              checked={settings.showPopupOnDoubleClick}
              onChange={v => settings.showPopupOnDoubleClick = v}
            />
            <div className="use-hotkey flex gaps">
              <Checkbox
                className="box grow"
                label={__i18n("display_popup_on_hotkey")}
                checked={settings.showPopupOnHotkey}
                onChange={v => settings.showPopupOnHotkey = v}
                tooltip={hotKey.title}
              />
              <label className="flex gaps">
                <Icon material="keyboard"/>
                <Input
                  readOnly={true}
                  className="hotkey"
                  value={hotKey.value}
                  onKeyDown={prevDefault(this.saveHotkey)}
                />
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
        <div className="flex gaps auto">
          <div className="translate-settings">
            <Checkbox
              label={__i18n("remember_last_typed_text")}
              checked={settings.rememberLastText}
              onChange={v => settings.rememberLastText = v}
            />
            <Button
              outline
              className="box flex gaps"
              onClick={() => createTab("chrome://extensions/shortcuts")}
              tooltip={__i18n("quick_access_configure_link")}
              children={__i18n("sub_header_quick_access_hotkey") + (
                appWindowCmd ? ` (${appWindowCmd})` : ""
              )}
            />
          </div>
          <div className="translate-delay">
            <div className="flex gaps align-baseline">
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
