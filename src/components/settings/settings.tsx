import * as styles from "./settings.module.scss";
import React from "react";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import isEqual from "lodash/isEqual";
import startCase from "lodash/startCase";
import { ProviderWithApiKey, DeepSeekAIModel, getTranslator, getTranslators, googleApiDomain, googleApiDomains, GrokAIModel, OpenAIModel, OpenAIModelTTSVoice, ProviderCodeName, Translator, GeminiAIModel, GeminiAIModelTTSVoice } from "@/providers";
import { XTranslateIcon } from "@/user-script/xtranslate-icon";
import { SelectLanguage, SelectLanguageChangeEvent } from "../select-language";
import { Checkbox } from "../checkbox";
import { Radio, RadioGroup } from "../radio";
import { ReactSelect, ReactSelectOption } from "../select";
import { Icon } from "../icon";
import { SubTitle } from "../sub-title";
import { Tab } from "../tabs";
import { settingsStore, XIconPosition } from "./settings.storage";
import { pageManager } from "../app/page-manager";
import { getMessage } from "@/i18n";
import { SelectVoice } from "../select-tts-voice";
import { getTTSVoices, speak, stopSpeaking } from "@/tts";
import { SelectAIModel } from "./select_ai_model";
import { ProviderAuthSettings } from "./provider_auth_settings";
import { materialIcons } from "@/config";
import { Notifications } from "../notifications";
import { Button } from "../button";
import { SelectProvider } from "../select-provider";
import { ShowHideMore } from "../show-hide-more";

@observer
export class Settings extends React.Component {
  private openAiVoiceOptions = this.getVoicesOptions(OpenAIModelTTSVoice);
  private geminiVoiceOptions = this.getVoicesOptions(GeminiAIModelTTSVoice);

  private googleApiDomainOptions: ReactSelectOption<string>[] = googleApiDomains.map(({ domain, title }) => {
    return {
      value: domain,
      label: title,
    } as ReactSelectOption<string>;
  });

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  private getVoicesOptions<Voice extends string>(voiceModels: Record<string, Voice>): ReactSelectOption<Voice>[] {
    return Object.values(voiceModels).map((voice: Voice) => ({
      value: voice,
      label: startCase(voice),
    }))
  }

  get providerSettings(): Partial<Record<ProviderCodeName, React.ReactNode>> {
    return {
      google: (
        <>
          <ReactSelect
            options={this.googleApiDomainOptions}
            value={this.googleApiDomainOptions.find(({ value }) => value === googleApiDomain.get())}
            onChange={({ value }) => googleApiDomain.set(value)}
          />
        </>
      ),
      openai: (
        <div className="flex gaps align-center">
          <SelectAIModel
            className={styles.providerSelect}
            modelOptions={OpenAIModel}
            getValue={() => settingsStore.data.openAiModel}
            onChange={value => settingsStore.data.openAiModel = value}
          />
          <ReactSelect
            className={styles.providerSelect}
            placeholder={getMessage("tts_select_voice_title")}
            options={this.openAiVoiceOptions}
            value={this.openAiVoiceOptions.find(voiceOpt => voiceOpt.value === settingsStore.data.tts.openAiVoice)}
            onChange={({ value }) => settingsStore.data.tts.openAiVoice = value}
          />
        </div>
      ),
      grok: (
        <SelectAIModel
          modelOptions={GrokAIModel}
          getValue={() => settingsStore.data.grokAiModel}
          onChange={value => settingsStore.data.grokAiModel = value}
        />
      ),
      deepseek: (
        <SelectAIModel
          modelOptions={DeepSeekAIModel}
          getValue={() => settingsStore.data.deepSeekModel}
          onChange={value => settingsStore.data.deepSeekModel = value}
        />
      ),
      gemini: (
        <SelectAIModel
          modelOptions={GeminiAIModel}
          getValue={() => settingsStore.data.geminiModel}
          onChange={value => settingsStore.data.geminiModel = value}
        />
      )
    }
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
      const selectedVoice = voices[settingsStore.data.tts.systemVoiceIndex];

      stopSpeaking();
      speak(this.demoVoiceText, selectedVoice);
    } else {
      stopSpeaking();
    }
  }

  renderProviderSettings({ name: provider, title, getAuthSettings }: Translator): React.ReactNode {
    const authSettings = getAuthSettings();
    const translator = getTranslator(provider);

    return (
      <div className={styles.providerSettings}>
        {translator.isRequireApiKey && (
          <ProviderAuthSettings
            {...authSettings}
            provider={provider}
            accessInfo={getMessage(`auth_access_info_api_key`, { provider: title })}
            accessInfoSetupSteps={getMessage(`auth_access_info_steps_${provider as ProviderWithApiKey}`)}
            clearKeyInfo={getMessage(`auth_clear_key_info`, { provider: title })}
          />
        )}
        {translator.isAvailable() && this.providerSettings[provider]}
      </div>
    )
  }

  renderProvider(provider: Translator) {
    const { name, title } = provider;
    const publicUrl = new URL(provider.publicUrl);
    const providerUrl = publicUrl.hostname.replace(/^www\./, "") + publicUrl.pathname.replace(/\/$/, "");

    return (
      <div key={name} className={`${styles.provider} flex gaps align-center`}>
        <Radio value={name} label={title}/>
        <a className={styles.providerUrl} href={publicUrl.toString()} title={publicUrl.origin} target="_blank" tabIndex={-1}>
          {providerUrl}
        </a>
        {this.renderProviderSettings(provider)}
      </div>
    )
  }

  @action
  onLanguageChange = ({ langTo, langFrom }: SelectLanguageChangeEvent) => {
    settingsStore.data.langTo = langTo;
    settingsStore.data.langFrom = langFrom;
  }

  @action
  onFullPageLanguageChange = ({ provider, ...langParams }: SelectLanguageChangeEvent) => {
    const { fullPageTranslation } = settingsStore.data;
    const translator = getTranslator(provider);
    const { langFrom, langTo } = translator.getSupportedLanguages(langParams);
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
  addAlwaysTranslatePage(pageUrl?: string) {
    pageUrl ??= window.prompt(getMessage("settings_title_full_page_always_translate"));
    if (pageUrl) this.addPageException(pageUrl, settingsStore.data.fullPageTranslation.alwaysTranslatePages);
  }

  render() {
    const settings = settingsStore.data;
    const { fullPageTranslation, showAdvancedProviders } = settings;
    const { alwaysTranslatePages } = fullPageTranslation;
    const providers = showAdvancedProviders
      ? getTranslators() // show all
      : getTranslators().filter(providers => !providers.isRequireApiKey);

    return (
      <main className={styles.Settings}>
        <SelectLanguage
          showReverseTranslation
          provider={settings.vendor}
          from={settings.langFrom}
          to={settings.langTo}
          onChange={this.onLanguageChange}
        />
        <RadioGroup className={styles.providers} value={settings.vendor} onChange={v => settingsStore.setProvider(v)}>
          {providers.map(this.renderProvider, this)}
        </RadioGroup>
        <ShowHideMore
          visible={settings.showAdvancedProviders}
          onToggle={visible => settings.showAdvancedProviders = visible}
          label={settings.showAdvancedProviders
            ? getMessage("settings_title_advanced_providers_list_hide")
            : getMessage("settings_title_advanced_providers_list_show")
          }
        />
        <SubTitle className={styles.SubTitle}>{getMessage("settings_title_full_page_translation")}</SubTitle>
        <div className="flex gaps align-center">
          <SelectLanguage
            className="box grow"
            provider={fullPageTranslation.provider}
            from={fullPageTranslation.langFrom}
            to={fullPageTranslation.langTo}
            onChange={this.onFullPageLanguageChange}
          />
          <SelectProvider
            value={fullPageTranslation.provider}
            onChange={this.onFullPageProviderChange}
            filter={(provider) => provider.isAvailable() && provider.canTranslateFullPage()}
          />
        </div>
        <ShowHideMore visible={fullPageTranslation.showMore} onToggle={v => fullPageTranslation.showMore = v}>
          <div className="alwaysTranslatePages flex gaps align-center">
            <span>{getMessage("settings_title_full_page_always_translate")} <b>({alwaysTranslatePages.length})</b></span>
            <ReactSelect
              value={null}
              className="box grow"
              menuNowrap={false}
              closeMenuOnSelect={false}
              placeholder={getMessage("settings_title_full_page_see_edit_list")}
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
          <div className="settings-fullpage flex column gaps align-start">
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
            <Checkbox
              label={getMessage("settings_title_full_page_show_traffic_save_mode")}
              tooltip={getMessage("settings_title_full_page_show_traffic_save_mode_info")}
              checked={fullPageTranslation.trafficSaveMode}
              onChange={val => fullPageTranslation.trafficSaveMode = val}
            />
          </div>
        </ShowHideMore>

        <SubTitle className={styles.SubTitle}>
          {getMessage("setting_title_translator_service")}
        </SubTitle>
        <Checkbox
          className={styles.inline}
          label={getMessage("pdf_use_custom_viewer")}
          tooltip={getMessage("pdf_use_custom_viewer_info")}
          checked={settings.customPdfViewer}
          onChange={v => settings.customPdfViewer = v}
        />
        <div className="translation-icon flex gaps">
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
          className={styles.inline}
          label={getMessage("auto_play_tts")}
          checked={settings.autoPlayText}
          onChange={v => settings.autoPlayText = v}
        />
        <div className={`${styles.inline} flex gaps align-center`}>
          <Checkbox
            className="box noshrink"
            label={getMessage("tts_default_system_voice")}
            checked={settings.useSpeechSynthesis}
            onChange={v => settings.useSpeechSynthesis = v}
            tooltip={getMessage("use_chrome_tts_tooltip_info")}
          />
          <SelectVoice
            currentIndex={settings.tts.systemVoiceIndex}
            onChange={v => settings.tts.systemVoiceIndex = v}
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
      </main>
    );
  }
}

pageManager.registerComponents("settings", {
  Tab: props => <Tab {...props} label={getMessage("tab_settings")} icon="settings"/>,
  Page: Settings,
});
