import * as styles from "./settings.module.scss";
import React from "react";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import isEqual from "lodash/isEqual";
import { getTranslators, Translator, VendorCodeName } from "../../vendors";
import { cssNames } from "../../utils";
import { XTranslateIcon } from "../../user-script/xtranslate-icon";
import { SelectLanguage } from "../select-language";
import { Checkbox } from "../checkbox";
import { Radio, RadioGroup } from "../radio";
import { ReactSelect, ReactSelectOption } from "../select";
import { Icon } from "../icon";
import { SubTitle } from "../sub-title";
import { Tab } from "../tabs";
import { settingsStore, XIconPosition } from "./settings.storage";
import { pageManager } from "../app/page-manager";
import { getMessage } from "../../i18n";
import { SelectVoice } from "../select-tts-voice";
import { getTTSVoices, speak, stopSpeaking } from "../../tts";
import { OpenAiSettings } from "./openai_settings";
import { VendorAuthSettings } from "./vendor_auth_settings";

@observer
export class Settings extends React.Component {
  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  private vendorSettings: Record<string/*name*/, React.ReactNode> = {
    openai: <OpenAiSettings/>,
  };

  private get iconPositions(): ReactSelectOption<XIconPosition>[] {
    return [
      { value: {}, label: "Auto" },
      { value: { left: true, top: true }, label: getMessage("popup_position_left_top") },
      { value: { right: true, top: true }, label: getMessage("popup_position_right_top") },
      { value: { right: true, bottom: true }, label: getMessage("popup_position_right_bottom") },
      { value: { left: true, bottom: true }, label: getMessage("popup_position_left_bottom") },
    ];
  };

  @observable demoVoiceText = "Quick brown fox jumps over the lazy dog";
  @observable isSpeaking = false;

  @action.bound
  editDemoVoiceText() {
    const newText = window.prompt(getMessage("tts_play_demo_sound_edit"), this.demoVoiceText);
    if (newText) {
      this.demoVoiceText = newText;
    }
  }

  @action.bound
  async speakDemoText() {
    this.isSpeaking = !this.isSpeaking;

    if (this.isSpeaking) {
      const voices = await getTTSVoices();
      const selectedVoice = voices[settingsStore.data.ttsVoiceIndex];

      stopSpeaking();
      speak(this.demoVoiceText, selectedVoice);
    } else {
      stopSpeaking();
    }
  }

  renderVendorAuthWidget(vendor: Translator): React.ReactNode {
    const content = this.vendorSettings[vendor.name];
    const props = vendor.getAuthSettings();
    if (props) {
      return <VendorAuthSettings {...props} children={content}/>;
    }
  }

  render() {
    const settings = settingsStore.data;
    return (
      <main className={styles.Settings}>
        <article>
          <SelectLanguage showReverseTranslation showInfoIcon/>
          <RadioGroup
            className={styles.vendors}
            value={settings.vendor}
            onChange={v => settingsStore.setVendor(v)}
          >
            {getTranslators().map(vendor => {
              const vendorName = vendor.title;
              const publicUrl = new URL(vendor.publicUrl);
              const name = vendor.name as VendorCodeName;
              const domain = publicUrl.hostname.replace(/^www\./, "") + publicUrl.pathname.replace(/\/$/, "");
              const skipInRotation = settingsStore.data.skipVendorInRotation[name];
              const disableInRotationClassName = cssNames({
                [styles.vendorSkippedInRotation]: skipInRotation,
              });
              return (
                <div key={name} className={cssNames(styles.vendor, "flex gaps")}>
                  <Checkbox
                    checked={skipInRotation}
                    onChange={checked => settingsStore.data.skipVendorInRotation[name] = checked}
                    tooltip={getMessage("skip_translation_vendor_in_rotation", { vendor: vendorName })}
                  />
                  <Radio value={name} label={<span className={disableInRotationClassName}>{vendorName}</span>}/>
                  <a href={String(publicUrl)} target="_blank" tabIndex={-1}>
                    {domain}
                  </a>
                  <div className="flex gaps align-center">
                    {this.renderVendorAuthWidget(vendor)}
                  </div>
                </div>
              )
            })}
          </RadioGroup>
        </article>

        <SubTitle>{getMessage("settings_title_appearance")}</SubTitle>
        <article className={styles.grid}>
          <Checkbox
            label={getMessage("pdf_use_custom_viewer")}
            tooltip={getMessage("pdf_use_custom_viewer_info")}
            checked={settings.customPdfViewer}
            onChange={v => settings.customPdfViewer = v}
          />
          <Checkbox
            label={getMessage("show_context_menu")}
            checked={settings.showInContextMenu}
            onChange={v => settingsStore.data.showInContextMenu = v}
          />
          <div className="flex gaps column">
            <Checkbox
              label={getMessage("display_icon_near_selection")}
              checked={settings.showIconNearSelection}
              onChange={v => settings.showIconNearSelection = v}
              tooltip={{ children: <XTranslateIcon style={{ position: "static" }}/> }}
            />
            {settings.showIconNearSelection && (
              <label>
                <span>{getMessage("position_of_x_translate_icon")}</span>
                <ReactSelect
                  options={this.iconPositions}
                  value={this.iconPositions.find(pos => isEqual(pos.value, settings.iconPosition))}
                  onChange={(opt: ReactSelectOption<XIconPosition>) => settings.iconPosition = opt.value}
                />
              </label>
            )}
          </div>
        </article>

        <SubTitle>{getMessage("settings_title_tts")}</SubTitle>
        <article className={styles.grid}>
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
          <label className="flex column">
            <span className="box noshrink">{getMessage("tts_default_system_voice")}</span>
            <div className="flex gaps align-center">
              <SelectVoice
                className="box grow"
                currentIndex={settings.ttsVoiceIndex}
                onChange={v => settings.ttsVoiceIndex = v}
              />
              <Icon
                small
                material="edit"
                tooltip={{ nowrap: true, children: getMessage("tts_play_demo_sound_edit") }}
                onClick={this.editDemoVoiceText}
              />
              <Icon
                small
                material={this.isSpeaking ? "pause_outline" : "play_circle_outline"}
                tooltip={{
                  nowrap: true,
                  children: `${getMessage("tts_play_demo_sound")}: "${this.demoVoiceText}"`,
                }}
                onClick={this.speakDemoText}
              />
            </div>
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
