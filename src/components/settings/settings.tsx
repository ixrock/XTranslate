import styles from "./settings.module.scss";
import React from "react";
import { observer } from "mobx-react";
import { getTranslators } from "../../vendors";
import { getHotkey, parseHotkey, prevDefault } from "../../utils";
import { XTranslateIcon } from "../../user-script/xtranslate-icon";
import { SelectLanguage } from "../select-language";
import { Input } from "../input";
import { Checkbox } from "../checkbox";
import { Radio, RadioGroup } from "../radio";
import { ReactSelect, ReactSelectOption } from "../select";
import { Icon } from "../icon";
import { Popup } from "../popup";
import { TooltipProps } from "../tooltip";
import { SubTitle } from "../sub-title";
import { Tab } from "../tabs";
import { PopupPosition, settingsStore } from "./settings.storage";
import { pageManager } from "../app/page-manager";
import { getMessage } from "../../i18n";
import { SelectVoice } from "../select-tts-voice";

export interface PopupPositionOption {
  value: PopupPosition;
  label: string;
}

@observer
export class Settings extends React.Component {
  private popupPositions: PopupPositionOption[] = [
    { value: "", label: getMessage("popup_position_auto") },
    { value: "left top", label: getMessage("popup_position_left_top") },
    { value: "left bottom", label: getMessage("popup_position_left_bottom") },
    { value: "right bottom", label: getMessage("popup_position_right_bottom") },
    { value: "right top", label: getMessage("popup_position_right_top") },
  ];

  onSaveHotkey = (evt: React.KeyboardEvent) => {
    var nativeEvent = evt.nativeEvent;
    var hotkey = parseHotkey(nativeEvent);
    if (hotkey.code) {
      settingsStore.data.hotkey = getHotkey(nativeEvent);
    }
  }

  render() {
    var settings = settingsStore.data;
    var hotKey = parseHotkey(settings.hotkey);
    var popupTooltip: Partial<TooltipProps> = {
      style: { background: "none" },
      children: <Popup translation={Popup.translationMock}/>
    };

    return (
      <main className={styles.Settings}>
        <article>
          <SelectLanguage showInfoIcon/>
          <RadioGroup
            className={styles.vendors}
            value={settings.vendor}
            onChange={v => settingsStore.setVendor(v)}
          >
            {getTranslators().map(vendor => {
              const { name, title, publicUrl } = vendor;
              var domain = publicUrl.match(/https?:\/\/(.*?)(?:\/\w*|$)/i)[1];
              return (
                <div key={name} className="flex gaps">
                  <Radio value={name} label={title}/>
                  <a href={publicUrl} target="_blank" tabIndex={-1}>
                    {domain.split('.').slice(-2).join('.')}
                  </a>
                  <div className="flex gaps align-center">
                    {vendor.renderSettingsListWidget()}
                  </div>
                </div>
              )
            })}
          </RadioGroup>
        </article>

        <SubTitle>{getMessage("settings_title_appearance")}</SubTitle>
        <article className={styles.grid}>
          <Checkbox
            label={getMessage("show_context_menu")}
            checked={settings.showInContextMenu}
            onChange={v => settingsStore.data.showInContextMenu = v}
          />
          <Checkbox
            label={getMessage("display_icon_near_selection")}
            checked={settings.showIconNearSelection}
            onChange={v => settings.showIconNearSelection = v}
            tooltip={<XTranslateIcon style={{ position: "unset" }}/>}
          />
        </article>

        <SubTitle>{getMessage("settings_title_tts")}</SubTitle>
        <article className="grid">
          <Checkbox
            label={getMessage("auto_play_tts")}
            checked={settings.autoPlayText}
            onChange={v => settings.autoPlayText = v}
          />
          <Checkbox
            label={getMessage("use_chrome_tts")}
            checked={settings.useSpeechSynthesis}
            onChange={v => settings.useSpeechSynthesis = v}
            tooltip={getMessage("use_chrome_tts_tooltip_info")}
          />
          <div className="flex gaps align-center">
            <p>{getMessage("tts_default_system_voice")}</p>
            <SelectVoice
              currentIndex={settings.ttsVoiceIndex}
              onChange={v => settings.ttsVoiceIndex = v}
            />
          </div>
        </article>

        <SubTitle>{getMessage("setting_title_popup")}</SubTitle>
        <article className={styles.grid}>
          <Checkbox
            label={getMessage("show_tts_icon_inside_popup")}
            checked={settings.showTextToSpeechIcon}
            onChange={v => settings.showTextToSpeechIcon = v}
            tooltip={popupTooltip}
          />
          <Checkbox
            label={getMessage("show_next_vendor_icon_in_popup")}
            checked={settings.showNextVendorIcon}
            onChange={v => settings.showNextVendorIcon = v}
            tooltip={popupTooltip}
          />
          <Checkbox
            label={getMessage("show_save_as_favorite_icon")}
            checked={settings.showSaveToFavoriteIcon}
            onChange={v => settings.showSaveToFavoriteIcon = v}
            tooltip={popupTooltip}
          />
          <Checkbox
            label={getMessage("show_copy_translation_icon")}
            checked={settings.showCopyTranslationIcon}
            onChange={v => settings.showCopyTranslationIcon = v}
            tooltip={popupTooltip}
          />
          <Checkbox
            label={getMessage("show_close_popup_button")}
            checked={settings.showClosePopupIcon}
            onChange={v => settings.showClosePopupIcon = v}
            tooltip={popupTooltip}
          />
          <Checkbox
            label={getMessage("show_detected_language_block")}
            checked={settings.showTranslatedFrom}
            onChange={v => settings.showTranslatedFrom = v}
            tooltip={popupTooltip}
          />
          <Checkbox
            label={getMessage("display_popup_after_text_selected")}
            checked={settings.showPopupAfterSelection}
            onChange={v => settings.showPopupAfterSelection = v}
          />
          <Checkbox
            label={getMessage("display_on_click_by_selected_text")}
            checked={settings.showPopupOnClickBySelection}
            onChange={v => settings.showPopupOnClickBySelection = v}
          />
          <Checkbox
            label={getMessage("display_popup_on_double_click")}
            checked={settings.showPopupOnDoubleClick}
            onChange={v => settings.showPopupOnDoubleClick = v}
          />
          <Checkbox
            className="box grow"
            label={getMessage("display_popup_on_hotkey") + ":"}
            checked={settings.showPopupOnHotkey}
            onChange={v => settings.showPopupOnHotkey = v}
            tooltip={hotKey.title}
          />
          <div className="popup-position flex gaps align-center">
            <Icon
              material="display_settings"
              tooltip={getMessage("popup_position_title")}
            />
            <ReactSelect
              menuPlacement="top"
              options={this.popupPositions}
              value={this.popupPositions.find(pos => pos.value === settings.popupPosition)}
              onChange={(opt: ReactSelectOption<PopupPosition>) => settings.popupPosition = opt.value}
            />
          </div>
          <label className="keyboard-hotkey flex">
            <Icon material="keyboard"/>
            <Input
              readOnly
              className={`${styles.hotkey} box grow`}
              value={hotKey.value}
              onKeyDown={prevDefault(this.onSaveHotkey)}
            />
          </label>
        </article>
      </main>
    );
  }
}

pageManager.registerComponents("settings", {
  Tab: props => <Tab {...props} label={getMessage("tab_settings")} icon="settings"/>,
  Page: Settings,
});
