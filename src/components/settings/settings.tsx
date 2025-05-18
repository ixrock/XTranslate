import * as styles from "./settings.module.scss";
import React from "react";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import isEqual from "lodash/isEqual";
import { getTranslators, Translator, ProviderCodeName, OpenAIModel, GrokAIModel } from "../../providers";
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
import { SelectAIModel } from "./select_ai_model";
import { ProviderAuthSettings } from "./auth_settings";
import { materialIcons } from "../../common-vars";

@observer
export class Settings extends React.Component {
  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  private providerSettings: Partial<Record<ProviderCodeName, React.ReactNode>> = {
    openai: (
      <SelectAIModel
        modelOptions={OpenAIModel}
        getValue={() => settingsStore.data.openAiModel}
        onChange={value => settingsStore.data.openAiModel = value}
      />
    ),
    grok: (
      <SelectAIModel
        modelOptions={GrokAIModel}
        getValue={() => settingsStore.data.grokAiModel}
        onChange={value => settingsStore.data.grokAiModel = value}
      />
    ),
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

  renderAuthSettings(translator: Translator): React.ReactNode {
    const content = this.providerSettings[translator.name];
    const props = translator.getAuthSettings();
    if (props) {
      return <ProviderAuthSettings {...props} children={content}/>;
    }
  }

  render() {
    const settings = settingsStore.data;
    return (
      <main className={styles.Settings}>
        <article>
          <SelectLanguage showReverseTranslation showInfoIcon/>
          <RadioGroup
            className={styles.providers}
            value={settings.vendor}
            onChange={v => settingsStore.setProvider(v)}
          >
            {getTranslators().map(provider => {
              const translatorName = provider.title;
              const publicUrl = new URL(provider.publicUrl);
              const name = provider.name as ProviderCodeName;
              const domain = publicUrl.hostname.replace(/^www\./, "") + publicUrl.pathname.replace(/\/$/, "");
              const skipInRotation = settingsStore.data.skipVendorInRotation[name];
              const disableInRotationClassName = cssNames({
                [styles.providerSkipRotation]: skipInRotation,
              });
              return (
                <div key={name} className={`${styles.translator} flex gaps align-center`}>
                  <Checkbox
                    checked={skipInRotation}
                    onChange={checked => settingsStore.data.skipVendorInRotation[name] = checked}
                    tooltip={getMessage("skip_translation_vendor_in_rotation", { vendor: translatorName })}
                  />
                  <Radio value={name} label={<span className={disableInRotationClassName}>{translatorName}</span>}/>
                  <a href={String(publicUrl)} target="_blank" tabIndex={-1}>
                    {domain}
                  </a>
                  <div className="flex gaps align-center">
                    {this.renderAuthSettings(provider)}
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
          <div className="flex gaps">
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
                  menuPlacement="auto"
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
          <div className={`${styles.systemTts} flex gaps align-center`}>
            <Checkbox
              className="box noshrink"
              label={getMessage("tts_default_system_voice")}
              checked={settings.useSpeechSynthesis}
              onChange={v => settings.useSpeechSynthesis = v}
              tooltip={getMessage("use_chrome_tts_tooltip_info")}
            />
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
              material={this.isSpeaking ? materialIcons.ttsPause : materialIcons.ttsPlay}
              tooltip={{
                nowrap: true,
                children: `${getMessage("tts_play_demo_sound")}: "${this.demoVoiceText}"`,
              }}
              onClick={this.speakDemoText}
            />
          </div>
        </article>
      </main>
    );
  }
}

pageManager.registerComponents("settings", {
  Tab: props => <Tab {...props} label={getMessage("tab_settings")} icon="settings"/>,
  Page: Settings,
});
