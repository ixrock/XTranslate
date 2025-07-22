import * as styles from "./settings_popup.module.scss";
import React from "react";
import { makeObservable } from "mobx";
import { observer } from "mobx-react";
import { getHotkey, parseHotkey, prevDefault } from "@/utils";
import { Input } from "../input";
import { Checkbox } from "../checkbox";
import { Icon } from "../icon";
import { popupHotkey, settingsStore } from "./settings.storage";
import { getMessage } from "@/i18n";
import { materialIcons } from "@/config";

@observer
export class SettingsPopup extends React.Component {
  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  onSaveHotkey = (evt: React.KeyboardEvent) => {
    const nativeEvent = evt.nativeEvent;
    const hotkey = parseHotkey(nativeEvent);
    if (hotkey.code) {
      popupHotkey.set({ hotkey: getHotkey(nativeEvent) })
    }
  }

  render() {
    const settings = settingsStore.data;
    const hotKey = parseHotkey(popupHotkey.get().hotkey);

    return (
      <div className={`${styles.SettingsPopup} flex auto gaps`}>
        <div className="left flex column gaps">
          <Checkbox
            label={getMessage("show_tts_icon_inside_popup")}
            checked={settings.showTextToSpeechIcon}
            onChange={v => settings.showTextToSpeechIcon = v}
            children={<Icon material={materialIcons.ttsPlay}/>}
          />
          <Checkbox
            label={getMessage("show_save_as_favorite_icon")}
            checked={settings.showSaveToFavoriteIcon}
            onChange={v => settings.showSaveToFavoriteIcon = v}
            children={<Icon material={materialIcons.unfavorite}/>}
          />
          <Checkbox
            label={getMessage("show_copy_translation_icon")}
            checked={settings.showCopyTranslationIcon}
            onChange={v => settings.showCopyTranslationIcon = v}
            children={<Icon material={materialIcons.copyTranslation}/>}
          />
          <Checkbox
            label={getMessage("show_select_provider_icon_in_popup")}
            checked={settings.showProviderSelectIcon}
            onChange={v => settings.showProviderSelectIcon = v}
            children={<Icon svg="google" small/>}
          />
          <Checkbox
            label={getMessage("show_detected_language_block")}
            checked={settings.showTranslatedFrom}
            onChange={v => settings.showTranslatedFrom = v}
          />
        </div>
        <div className="right flex column gaps">
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
            <label className="flex gaps align-center">
              <Icon material="keyboard"/>
              <Input
                readOnly
                className={`${styles.hotkey} box grow`}
                value={hotKey.value}
                onKeyDown={prevDefault(this.onSaveHotkey)}
              />
            </label>
          </div>
        </div>
      </div>
    );
  }
}
