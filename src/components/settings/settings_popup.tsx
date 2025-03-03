import * as styles from "./settings_popup.module.scss";
import React from "react";
import { makeObservable } from "mobx";
import { observer } from "mobx-react";
import { getHotkey, parseHotkey, prevDefault } from "../../utils";
import { Input } from "../input";
import { Checkbox } from "../checkbox";
import { ReactSelect, ReactSelectOption } from "../select";
import { Icon } from "../icon";
import { PopupPosition, settingsStore } from "./settings.storage";
import { getMessage } from "../../i18n";

@observer
export class SettingsPopup extends React.Component {
  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  private get popupPositions(): ReactSelectOption<string>[] {
    return [
      { value: "", label: getMessage("popup_position_auto") },
      { value: "left top", label: getMessage("popup_position_left_top") },
      { value: "right top", label: getMessage("popup_position_right_top") },
      { value: "right bottom", label: getMessage("popup_position_right_bottom") },
      { value: "left bottom", label: getMessage("popup_position_left_bottom") },
    ]
  }

  onSaveHotkey = (evt: React.KeyboardEvent) => {
    const nativeEvent = evt.nativeEvent;
    const hotkey = parseHotkey(nativeEvent);
    if (hotkey.code) {
      settingsStore.data.hotkey = getHotkey(nativeEvent);
    }
  }

  render() {
    const settings = settingsStore.data;
    const hotKey = parseHotkey(settings.hotkey);

    return (
      <div className={styles.SettingsPopup}>
        <Checkbox
          label={getMessage("show_tts_icon_inside_popup")}
          checked={settings.showTextToSpeechIcon}
          onChange={v => settings.showTextToSpeechIcon = v}
        />
        <Checkbox
          label={getMessage("show_next_vendor_icon_in_popup")}
          checked={settings.showNextVendorIcon}
          onChange={v => settings.showNextVendorIcon = v}
        />
        <Checkbox
          label={getMessage("show_save_as_favorite_icon")}
          checked={settings.showSaveToFavoriteIcon}
          onChange={v => settings.showSaveToFavoriteIcon = v}
        />
        <Checkbox
          label={getMessage("show_copy_translation_icon")}
          checked={settings.showCopyTranslationIcon}
          onChange={v => settings.showCopyTranslationIcon = v}
        />
        <Checkbox
          label={getMessage("show_close_popup_button")}
          checked={settings.showClosePopupIcon}
          onChange={v => settings.showClosePopupIcon = v}
        />
        <Checkbox
          label={getMessage("show_detected_language_block")}
          checked={settings.showTranslatedFrom}
          onChange={v => settings.showTranslatedFrom = v}
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
        <div className="flex column gaps">
          <Checkbox
            className="box grow"
            label={getMessage("display_popup_on_hotkey") + ":"}
            checked={settings.showPopupOnHotkey}
            onChange={v => settings.showPopupOnHotkey = v}
            tooltip={hotKey.title}
          />
          <label className="keyboard-hotkey flex gaps align-center">
            <Icon material="keyboard"/>
            <Input
              readOnly
              className={`${styles.hotkey} box grow`}
              value={hotKey.value}
              onKeyDown={prevDefault(this.onSaveHotkey)}
            />
          </label>
        </div>
        <label className="popup-position flex gaps align-center">
          <Icon
            material="display_settings"
            tooltip={getMessage("popup_position_title")}
          />
          <ReactSelect
            menuPlacement="auto"
            options={this.popupPositions}
            value={this.popupPositions.find(pos => pos.value === settings.popupPosition)}
            onChange={(opt: ReactSelectOption<PopupPosition>) => settings.popupPosition = opt.value}
          />
        </label>
      </div>
    );
  }
}
