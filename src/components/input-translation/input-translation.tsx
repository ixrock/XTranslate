import "./input-translation.scss";
import isEqual from "lodash/isEqual";
import React, { Fragment } from "react";
import { action, comparer, makeObservable, observable, reaction, toJS } from "mobx";
import { observer } from "mobx-react";
import { getTranslator, getXTranslatePro, isRTL, ITranslationError, ITranslationResult, ProviderCodeName, Translator } from "@/providers";
import { cssNames, disposer, isHotkeyPressed } from "@/utils";
import { SelectLanguage } from "../select-language";
import { Input } from "../input";
import { Spinner } from "../spinner";
import { settingsStore } from "../settings/settings.storage";
import { pageManager } from "../app/page-manager";
import { Tab } from "../tabs";
import { Icon } from "../icon";
import { Tooltip } from "../tooltip";
import { getUrlParams, navigation, TranslationPageParams } from "@/navigation";
import { createStorage } from "@/storage";
import { getMessage } from "@/i18n";
import { materialIcons } from "@/config";
import { isFavorite } from "../user-history/favorites.storage";
import { saveToFavoritesAction } from "@/background/history.bgc";
import { getSelectedText } from "@/extension";
import { CopyToClipboardIcon } from "../copy-to-clipboard-icon";
import { SelectProvider } from "../select-provider";
import { Button } from "@/components/button";
import { userStore } from "@/pro";

@observer
export class InputTranslation extends React.Component {
  private dispose = disposer();
  private input?: Input;
  private lastParams?: TranslationPageParams;
  private lastInputText = createStorage<string>("last_input_text");

  get urlParams(): TranslationPageParams {
    const { provider, text, to, from } = getUrlParams<TranslationPageParams>();
    return { page: "translate", provider, from, to, text };
  }

  @observable isLoading = false;
  @observable params?: TranslationPageParams;
  @observable translation?: ITranslationResult;
  @observable error?: ITranslationError;
  @observable summarized = "";

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  @action
  async componentDidMount() {
    this.dispose.push(this.bindAutoTranslate());

    await this.lastInputText.load();

    const { rememberLastText, vendor, langFrom, langTo, textInputAutoTranslateEnabled } = settingsStore.data;
    const selectedText = await getSelectedText();

    this.params = {
      page: "translate",
      provider: this.urlParams.provider ?? vendor,
      from: this.urlParams.from ?? langFrom,
      to: this.urlParams.to ?? langTo,
      text: this.urlParams.text || selectedText || (rememberLastText ? this.lastInputText.get() : ""),
    };

    if (textInputAutoTranslateEnabled) void this.translate();
  }

  componentWillUnmount() {
    this.dispose();
  }

  private bindAutoTranslate() {
    return reaction(() => toJS(this.params), (params: TranslationPageParams) => {
      if (!settingsStore.data.textInputAutoTranslateEnabled) return;
      void this.translate(params);
    }, {
      equals: comparer.structural,
      delay: settingsStore.data.textInputTranslateDelayMs,
    });
  }

  @observable isSpeaking = false;
  @observable isPaused = false;

  @action.bound
  resetSpeakingState() {
    this.isSpeaking = false;
    this.isPaused = false;
  }

  @action.bound
  speak = async () => {
    let { provider, text, from } = this.params;

    if (from === "auto" && provider === ProviderCodeName.GOOGLE) {
      await this.translate(); // google-tts api requires `lang` param to be defined
      const { vendor, langDetected, originalText } = this.translation;
      provider = vendor;
      from = langDetected;
      text = originalText;
    }

    const translator = getTranslator(provider);

    if (this.isSpeaking) {
      this.isPaused = !this.isPaused;
      return translator.pauseSpeaking();
    }

    try {
      this.isSpeaking = true;
      this.isPaused = false;

      const media = await translator.speak(text, from);

      if (media instanceof HTMLAudioElement) {
        media.onended = this.resetSpeakingState;
      } else if (media instanceof SpeechSynthesisUtterance) {
        media.onend = this.resetSpeakingState;
      }

      if (!media) {
        this.isSpeaking = false;
      }
    } catch (err) {
      this.resetSpeakingState();
    }
  }

  @action.bound
  translateText(text: string) {
    this.params.text = text;
    return this.translate();
  }

  @action.bound
  async translate(params = { ...this.params }) {
    if (!params.text || isEqual(this.lastParams, params)) {
      return;
    }

    this.input?.focus(); // autofocus input-field
    this.input?.setValue(params.text); // update input value manually since @defaultValue is utilized
    this.translation = null;
    this.error = null;
    this.isLoading = true;
    this.summarized = "";

    try {
      this.lastParams = params;
      const translation = await getTranslator(params.provider).translate({
        from: params.from,
        to: params.to,
        text: params.text.trim(),
      });
      if (isEqual(params, this.params)) {
        this.translation = translation;
      }
    } catch (error) {
      if (isEqual(params, this.params)) {
        this.error = error;
      }
    } finally {
      this.isLoading = false;
      this.updateUrl(params);
    }
  };

  private updateUrl(newParams = this.params) {
    if (!isEqual(this.urlParams, newParams)) {
      navigation.searchParams.replace(newParams);
    }
  }

  @action
  onLangChange = (from: string, to: string) => {
    this.params.from = from;
    this.params.to = to;
    this.updateUrl();
    this.resetSpeakingState();
  }

  @action
  onProviderChange = (provider: ProviderCodeName) => {
    const translator = getTranslator(provider);
    const { textInputAutoTranslateEnabled } = settingsStore.data;

    const supportedLanguages = translator.getSupportedLanguages({
      langFrom: this.params.from,
      langTo: this.params.to,
    });

    const prevProvider = this.params.provider;
    this.params.provider = provider;
    this.params.from = supportedLanguages.langFrom;
    this.params.to = supportedLanguages.langTo;
    this.updateUrl();
    this.resetSpeakingState();

    if (provider === ProviderCodeName.XTRANSLATE_PRO && !userStore.isProActive) {
      this.params.provider = prevProvider; // rollback
      userStore.subscribeSuggestionDialog();
    } else if (textInputAutoTranslateEnabled) {
      void this.translate();
    }
  }

  private saveToFavorites = (isFavorite: boolean) => {
    void saveToFavoritesAction({
      item: this.translation,
      isFavorite: isFavorite,
      source: "translate_tab",
    });
  }

  renderTranslationResult() {
    const { langTo, langDetected, translation, transcription, dictionary, spellCorrection, sourceLanguages, vendor } = this.translation;
    const translator = getTranslator(vendor);
    const favorite = isFavorite(this.translation);
    const translationDirection = Translator.getLangPairTitleShort(langDetected, langTo);

    return (
      <div className={cssNames("translation-results", { rtl: isRTL(langTo) })}>
        {translation ?
          <div className="translation flex gaps align-center">
            <div className="flex column gaps">
              <Icon
                material={this.isPaused ? materialIcons.ttsPause : materialIcons.ttsPlay}
                tooltip={getMessage("popup_play_icon_title")}
                onClick={this.speak}
              />
              <CopyToClipboardIcon
                content={this.translation}
                tooltip={getMessage("popup_copy_translation_title")}
              />
            </div>
            <div className="value box grow">
              <span>{translation}</span>
              {transcription ? <i className="transcription">[{transcription}]</i> : null}
            </div>
            <div className="flex column align-center">
              <Icon
                material={favorite ? materialIcons.favorite : materialIcons.unfavorite}
                tooltip={favorite ? getMessage("history_unmark_as_favorite") : getMessage("history_mark_as_favorite")}
                onClick={() => this.saveToFavorites(!favorite)}
              />
              <div className="lang" id="translated_with">
                {translationDirection}
                <Tooltip anchorId="translated_with" following nowrap>
                  {getMessage("translated_with", {
                    translator: translator.title,
                    lang: translator.getLangPairTitle(langDetected, langTo),
                  })}
                </Tooltip>
              </div>
            </div>
          </div>
          : null}
        {spellCorrection ? (
          <div className="spell-correction">
            {getMessage("spell_correction", {
              suggestion: (
                <b key="correction" className="link" onClick={() => this.translateText(spellCorrection)}>
                  {spellCorrection}
                </b>
              )
            })}
          </div>
        ) : null}
        {sourceLanguages?.length > 0 && (
          <div className="source-languages">
            {`${getMessage("translate_also_from")}: `}
            {sourceLanguages.map(lang => {
              if (lang === langDetected) return; // skip language for current results
              return (
                <b key={lang} className="link" onClick={action(() => this.params.from = lang)}>
                  {translator.langFrom[lang]}
                </b>
              )
            })}
          </div>
        )}
        <table className="dictionary">
          <tbody>
          {dictionary.map(({ wordType, meanings }) => {
            return (
              <Fragment key={wordType}>
                <tr>
                  <td className="word-type" colSpan={2}>{wordType}</td>
                </tr>
                {meanings.map(meaning => {
                  const examples = meaning.examples
                    ? meaning.examples.map(example => example.join(" - ")).join("\n")
                    : "";
                  return (
                    <tr key={meaning.word}>
                      <td className="word">
                        <span className="link" onClick={action(() => {
                          this.params.from = langTo;
                          this.params.to = langDetected;
                          this.translateText(meaning.word);
                        })}>
                          {meaning.word}
                        </span>
                        {examples ? <span className="examples" title={examples}>*</span> : null}
                      </td>
                      <td className="word-meanings">
                        {meaning.translation.map((word, i, list) => {
                          const last = i === list.length - 1;
                          return [
                            <span key={i} className="link" onClick={() => this.translateText(word)}>{word}</span>,
                            !last ? ", " : null
                          ];
                        })}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            )
          })}
          </tbody>
        </table>
      </div>
    )
  }

  renderTranslationError() {
    const { statusCode, message } = this.error;
    return (
      <div className="translation-error flex column gaps">
        <p>{statusCode}: {getMessage("translation_data_failed")}</p>
        <p dangerouslySetInnerHTML={{ __html: message }}/>
      </div>
    );
  }

  renderSummarizeResult() {
    return (
      <div className={cssNames("translation-results", { rtl: isRTL(this.params.to) })}>
        {this.summarized}
      </div>
    )
  }

  renderTranslation() {
    const { params, isLoading, translation, error, summarized } = this;
    if (!params.text) return;
    if (isLoading) return <Spinner center/>;
    if (translation) return this.renderTranslationResult();
    if (summarized) return this.renderSummarizeResult();
    if (error) return this.renderTranslationError();
  }

  @action.bound
  setTranslationDelay() {
    const currentDelay = settingsStore.data.textInputTranslateDelayMs;
    const delayInput = window.parseInt(
      window.prompt(getMessage("translation_delay_info"), String(currentDelay))
    );

    if (isNaN(delayInput)) {
      return;
    }
    settingsStore.data.textInputTranslateDelayMs = delayInput;
  }

  @action.bound
  onInputChange(val: string) {
    this.params.text = val;

    if (this.error) {
      this.error = null; // reset previous error first (if any)
    }
    if (settingsStore.data.rememberLastText) {
      this.lastInputText.set(val);
    }
  }

  @action
  async summarize() {
    if (!userStore.isProActive) {
      userStore.subscribeSuggestionDialog();
      return;
    }

    const { provider, to: langTo, text } = this.params;
    if (!text) return;

    if (provider !== ProviderCodeName.XTRANSLATE_PRO) {
      this.params.provider = ProviderCodeName.XTRANSLATE_PRO;
    }

    this.isLoading = true;
    this.error = null;
    this.translation = null;

    try {
      this.summarized = await getXTranslatePro().summarize({ text, targetLang: langTo });
    } catch (err) {
      this.error = err;
    } finally {
      this.isLoading = false;
    }
  }

  @action.bound
  toggleAutoTranslation() {
    settingsStore.data.textInputAutoTranslateEnabled = !settingsStore.data.textInputAutoTranslateEnabled;
  }

  @action.bound
  bindInputRef(elem: Input) {
    this.input = elem;
  }

  render() {
    if (!this.params) return;
    const { textInputTranslateDelayMs: delayMs, rememberLastText, textInputAutoTranslateEnabled } = settingsStore.data;

    const { provider, from: langFrom, to: langTo, text } = this.params;
    const ttsClassButton = cssNames("flex gaps align-center", {
      ttsPaused: this.isPaused,
    });

    return (
      <div className="InputTranslation flex column gaps">
        <div className="language flex gaps">
          <SelectLanguage
            provider={provider}
            from={langFrom}
            to={langTo}
            onChange={({ langTo, langFrom }) => this.onLangChange(langFrom, langTo)}
          />
          <SelectProvider
            value={provider}
            onChange={this.onProviderChange}
          />
        </div>
        <div className="flex gaps align-center">
          <Input
            className="input"
            autoFocus={true}
            multiLine={true}
            rows={2}
            placeholder={getMessage("text_field_placeholder")}
            defaultValue={text}
            onChange={this.onInputChange}
            onKeyDown={evt => isHotkeyPressed({ key: "Enter" }, evt) && this.translate()}
            ref={this.bindInputRef}
            infoContent={(
              <small className="hint">
                {getMessage(textInputAutoTranslateEnabled ? "text_input_auto_translation_enabled" : "text_input_auto_translation_disabled", {
                  toggle: v => <a onClick={this.toggleAutoTranslation}><b>{v}</b></a>
                })}
                {" | "}
                {getMessage("text_input_auto_translation_timeout", {
                  timeout: <a onClick={this.setTranslationDelay}><b>{delayMs || 0}</b></a>,
                })}
              </small>
            )}
          />
          <Icon
            className="rememberTextIcon"
            material={rememberLastText ? "bookmark" : "bookmark_border"}
            active={rememberLastText}
            tooltip={{ nowrap: true, children: getMessage("remember_last_typed_text") }}
            onClick={action(() => settingsStore.data.rememberLastText = !rememberLastText)}
          />
        </div>

        {this.renderTranslation()}

        <div className="buttons flex gaps justify-center">
          <Button
            primary
            className="flex gaps align-center"
            onClick={() => this.translate()}
          >
            <Icon material={materialIcons.translate}/>
            <span>{getMessage("translate_button")}</span>
          </Button>
          <Button
            outline
            className={ttsClassButton}
            onClick={() => this.speak()}
          >
            <Icon svg="tts"/>
            <span>{getMessage("tts_button")}</span>
          </Button>
          <Button
            className="flex gaps align-center"
            onClick={() => this.summarize()}
          >
            <Icon material={materialIcons.summarize}/>
            <span>{getMessage("summarize_button")}</span>
          </Button>
        </div>
      </div>
    );
  }
}

pageManager.registerComponents("translate", {
  Tab: props => <Tab {...props} label={getMessage("tab_text_input")} icon="translate"/>,
  Page: InputTranslation,
});
