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
import { ISettingsStoreData, settingsStore } from "./settings.store";
import { Button } from "../button";
import { Tooltip } from "../tooltip";
import { Popup } from "../popup";

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

  renderPopupPreview(customSettings?: Partial<ISettingsStoreData>) {
    return (
      <Tooltip following className="popup-preview">
        <Popup preview/>
      </Tooltip>
    )
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
            checked={settings.autoPlayText}
            onChange={v => settings.autoPlayText = v}
          />
          <Checkbox
            label={__i18n("show_context_menu")}
            checked={settings.showInContextMenu}
            onChange={v => settings.showInContextMenu = v}
          />
          <Checkbox
            label={__i18n("display_icon_near_selection")}
            checked={settings.showIconNearSelection}
            onChange={v => settings.showIconNearSelection = v}
          />
        </div>

        <p className="sub-title">{__i18n("setting_title_translator_service")}</p>
        <div className="service flex">
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
        <div className="display-options flex gaps auto">
          <div className="checkbox-group">
            <Checkbox
              label={__i18n("show_tts_icon_inside_popup")}
              checked={settings.showTextToSpeechIcon}
              onChange={v => settings.showTextToSpeechIcon = v}
              children={this.renderPopupPreview({ showTextToSpeechIcon: true })}
            />
            <Checkbox
              label={__i18n("show_next_vendor_icon_in_popup")}
              checked={settings.showNextVendorIcon}
              onChange={v => settings.showNextVendorIcon = v}
              children={this.renderPopupPreview({ showNextVendorIcon: true })}
            />
            <Checkbox
              label={__i18n("show_copy_translation_icon")}
              checked={settings.showCopyTranslationIcon}
              onChange={v => settings.showCopyTranslationIcon = v}
              children={this.renderPopupPreview({ showCopyTranslationIcon: true })}
            />
          </div>
          <div className="checkbox-group">
            <Checkbox
              label={__i18n("display_popup_after_text_selected")}
              checked={settings.showPopupAfterSelection}
              onChange={v => settings.showPopupAfterSelection = v}
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
              />
              <label className="flex gaps">
                <Icon material="keyboard"/>
                <Input
                  readOnly className="hotkey"
                  value={hotKey.value}
                  onKeyDown={this.saveHotkey}
                >
                  <Tooltip following>
                    {hotKey.title}
                  </Tooltip>
                </Input>
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
              checked={settings.rememberLastText}
              onChange={v => settings.rememberLastText = v}
            />
            <Button
              outline
              className="box flex gaps"
              label={__i18n("sub_header_quick_access_hotkey")}
              onClick={() => createTab("chrome://extensions/configureCommands")}
            >
              <Tooltip following nowrap={false}>
                {__i18n("quick_access_configure_link")}
              </Tooltip>
            </Button>
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
