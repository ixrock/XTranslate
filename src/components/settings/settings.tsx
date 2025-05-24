import * as styles from "./settings.module.scss";
import React from "react";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import isEqual from "lodash/isEqual";
import { getTranslator, getTranslators, GrokAIModel, OpenAIModel, ProviderCodeName, Translator } from "../../providers";
import { cssNames } from "../../utils";
import { XTranslateIcon } from "../../user-script/xtranslate-icon";
import { SelectLanguage, SelectLanguageChangeEvent } from "../select-language";
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
import { Notifications } from "../notifications";
import { Button } from "../button";

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

  private fullPageTranslateProvidersOptions: ReactSelectOption<ProviderCodeName>[] = getTranslators()
    .filter(translator => translator.canTranslateFullPage())
    .map(({ name, title }) => ({ value: name, label: title }));

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

  renderAuthSettings({ name: provider, title, getAuthSettings }: Translator): React.ReactNode {
    const authParams = getAuthSettings();
    if (authParams) {
      return (
        <ProviderAuthSettings
          {...authParams}
          provider={provider}
          accessInfo={getMessage(`auth_access_info_steps_${provider}`)}
          accessInfo2={getMessage(`auth_access_info_api_key`, { provider: title })}
          clearKeyInfo={getMessage(`auth_clear_key_info`, { provider: title })}
          warningInfo={getMessage(`auth_safety_warning_info`)}
        >
          {this.providerSettings[provider]}
        </ProviderAuthSettings>
      );
    }
  }

  @action
  onLanguageChange = ({ langTo, langFrom }: SelectLanguageChangeEvent) => {
    settingsStore.data.langTo = langTo;
    settingsStore.data.langFrom = langFrom;
  }

  @action
  onFullPageLanguageChange = ({ langTo, langFrom }: SelectLanguageChangeEvent) => {
    const { fullPageTranslation } = settingsStore.data;
    fullPageTranslation.langTo = langTo;
    fullPageTranslation.langFrom = langFrom;
  }

  @action
  onFullPageProviderChange = (provider: ProviderCodeName) => {
    const { fullPageTranslation } = settingsStore.data;
    const translator = getTranslator(provider);
    const supportedLanguages = translator.getSupportedLanguages(fullPageTranslation)
    fullPageTranslation.provider = provider;
    fullPageTranslation.langFrom = supportedLanguages.langFrom;
    fullPageTranslation.langTo = supportedLanguages.langTo;
  };

  private addPageException(pageAddr: string, list: string[]) {
    try {
      const pageUrl = String(new URL(pageAddr));
      const alreadyExists = list.find(url => pageUrl === url);
      if (!alreadyExists) list.push(pageUrl);
    } catch (err) {
      Notifications.error(`${getMessage("settings_title_full_page_add_url_error")}: ${pageAddr}`);
    }
  }

  private formatPageUrlLabel(pageUrl: string, list: string[]): React.ReactNode {
    const removeItem = () => {
      const index = list.indexOf(pageUrl);
      if (index > -1) list.splice(index, 1);
    };
    return (
      <div className="page-url-exception flex gaps">
        <span className="box grow">{pageUrl}</span>
        <Icon small material="clear" onClick={removeItem}/>
      </div>
    )
  }

  @action
  addExcludedTranslationPage = (pageUrl?: string) => {
    pageUrl ??= window.prompt(getMessage("settings_title_full_page_excluded_pages"));
    this.addPageException(pageUrl, settingsStore.data.fullPageTranslation.excludedPages);
  }

  @action
  addAlwaysTranslatePage(pageUrl?: string) {
    pageUrl ??= window.prompt(getMessage("settings_title_full_page_always_translate"));
    this.addPageException(pageUrl, settingsStore.data.fullPageTranslation.alwaysTranslatePages);
  }

  render() {
    const settings = settingsStore.data;
    const { fullPageTranslation } = settings;
    const { excludedPages, alwaysTranslatePages } = fullPageTranslation;

    return (
      <main className={`${styles.Settings} flex column gaps`}>
        <article className="flex column gaps">
          <SelectLanguage
            showReverseTranslation showInfoIcon
            provider={settings.vendor}
            from={settings.langFrom}
            to={settings.langTo}
            onChange={this.onLanguageChange}
          />
          <RadioGroup className={styles.providers} value={settings.vendor} onChange={v => settingsStore.setProvider(v)}>
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
                <div key={name} className={`${styles.provider} flex gaps align-center`}>
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

        <SubTitle>{getMessage("settings_title_full_page_translation")}</SubTitle>
        <article className="flex column gaps">
          <div className="flex gaps align-center">
            <SelectLanguage
              className="box grow"
              provider={fullPageTranslation.provider}
              from={fullPageTranslation.langFrom}
              to={fullPageTranslation.langTo}
              onChange={this.onFullPageLanguageChange}
            />
            <ReactSelect
              value={this.fullPageTranslateProvidersOptions.find(opt => opt.value === fullPageTranslation.provider)}
              options={this.fullPageTranslateProvidersOptions}
              onChange={({ value }) => this.onFullPageProviderChange(value)}
            />
          </div>
          <div className="alwaysTranslatePages flex gaps align-center">
            <span>{getMessage("settings_title_full_page_always_translate")}: {alwaysTranslatePages.length}</span>
            <ReactSelect
              value={null}
              className="box grow"
              menuNowrap={false}
              closeMenuOnSelect={false}
              noOptionsMessage={() => getMessage("settings_title_full_page_empty_list")}
              options={alwaysTranslatePages.map(value => ({ value, label: value }))}
              formatOptionLabel={({ value }: ReactSelectOption<string>) => this.formatPageUrlLabel(value, alwaysTranslatePages)}
            />
            <Button
              primary
              label={getMessage("settings_title_full_page_add_url")}
              onClick={() => this.addAlwaysTranslatePage()}
            />
          </div>
          <div className="excludedPages flex gaps align-center">
            <span>{getMessage("settings_title_full_page_excluded_pages")}: {excludedPages.length}</span>
            <ReactSelect
              value={null}
              className="box grow"
              menuNowrap={false}
              closeMenuOnSelect={false}
              noOptionsMessage={() => getMessage("settings_title_full_page_empty_list")}
              options={excludedPages.map(value => ({ value, label: value }))}
              formatOptionLabel={({ value }: ReactSelectOption<string>) => this.formatPageUrlLabel(value, excludedPages)}
            />
            <Button
              primary
              label={getMessage("settings_title_full_page_add_url")}
              onClick={() => this.addExcludedTranslationPage()}
            />
          </div>
          <div className={styles.grid}>
            <Checkbox
              label={getMessage("settings_title_full_page_show_original_onmouseover")}
              checked={fullPageTranslation.showOriginalOnHover}
              onChange={val => fullPageTranslation.showOriginalOnHover = val}
            />
            <Checkbox
              label={getMessage("settings_title_full_page_show_translation_onmouseover")}
              checked={fullPageTranslation.showTranslationOnHover}
              onChange={val => fullPageTranslation.showTranslationOnHover = val}
            />
            <Checkbox
              label={getMessage("settings_title_full_page_show_replace_texts")}
              checked={fullPageTranslation.showTranslationInDOM}
              onChange={val => fullPageTranslation.showTranslationInDOM = val}
            />
          </div>
        </article>

        <SubTitle>{getMessage("settings_title_appearance")}</SubTitle>
        <article className="flex column gaps">
          <div className="flex gaps">
            <Checkbox
              label={getMessage("display_icon_near_selection")}
              checked={settings.showIconNearSelection}
              onChange={v => settings.showIconNearSelection = v}
              tooltip={{ children: <XTranslateIcon style={{ position: "static" }}/> }}
            />
            {settings.showIconNearSelection && (
              <ReactSelect
                menuPlacement="auto"
                className="box noshrink"
                options={this.iconPositions}
                value={this.iconPositions.find(pos => isEqual(pos.value, settings.iconPosition))}
                onChange={(opt: ReactSelectOption<XIconPosition>) => settings.iconPosition = opt.value}
              />
            )}
          </div>
          <Checkbox
            label={getMessage("pdf_use_custom_viewer")}
            tooltip={getMessage("pdf_use_custom_viewer_info")}
            checked={settings.customPdfViewer}
            onChange={v => settings.customPdfViewer = v}
          />
        </article>

        <SubTitle>{getMessage("settings_title_tts")}</SubTitle>
        <article className="flex column gaps">
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
