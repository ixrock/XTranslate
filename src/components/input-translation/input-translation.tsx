import "./input-translation.scss";
import isEqual from "lodash/isEqual";
import React, { Fragment } from "react";
import { action, comparer, computed, makeObservable, observable, reaction, runInAction, toJS } from "mobx";
import { observer } from "mobx-react";
import { getTranslator, isRTL, ITranslationError, ITranslationResult, ProviderCodeName, Translator } from "@/providers";
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
import { isMac, materialIcons } from "@/config";
import { isFavorite } from "../user-history/favorites.storage";
import { saveToFavoritesAction } from "@/background/history.bgc";
import { getSelectedText } from "@/extension";
import { CopyToClipboardIcon } from "../copy-to-clipboard-icon";
import { SelectProvider } from "../select-provider";

@observer
export class InputTranslation extends React.Component {
  private dispose = disposer();
  private input?: Input;
  private lastParams?: TranslationPageParams;
  private lastInputText = createStorage<string>("last_input_text");

  @computed get urlParams(): TranslationPageParams {
    const { provider, text, to, from } = getUrlParams<TranslationPageParams>();
    return { page: "translate", provider, from, to, text };
  }

  @observable isLoading = false;
  @observable params?: TranslationPageParams;
  @observable translation?: ITranslationResult;
  @observable error?: ITranslationError;

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    await this.lastInputText.load();

    const { rememberLastText, vendor, langFrom, langTo } = settingsStore.data;
    const selectedText = await getSelectedText();

    runInAction(() => {
      this.params = {
        page: "translate",
        provider: this.urlParams.provider ?? vendor,
        from: this.urlParams.from ?? langFrom,
        to: this.urlParams.to ?? langTo,
        text: this.urlParams.text || selectedText || (rememberLastText ? this.lastInputText.get() : ""),
      };
    })

    void this.translate();
    this.dispose.push(this.bindAutoTranslate());
  }

  componentWillUnmount() {
    this.dispose();
  }

  private bindAutoTranslate() {
    return reaction(() => toJS(this.params), (params: TranslationPageParams) => {
      void this.translate(params);

      if (settingsStore.data.rememberLastText) {
        this.lastInputText.set(params.text);
      }
      if (!isEqual(this.urlParams, params)) {
        navigation.searchParams.replace(params); // update url
      }
    }, {
      equals: comparer.structural,
      delay: settingsStore.data.textInputTranslateDelayMs,
    });
  }

  playText = async () => {
    const { vendor, langDetected, originalText } = this.translation;
    await getTranslator(vendor).speak(langDetected, originalText);
  }

  @action.bound
  translateText(text: string) {
    this.params.text = text;
    return this.translate();
  }

  @action
  async translate(params = { ...this.params }) {
    if (!params.text || isEqual(this.lastParams, params)) {
      return;
    }

    this.input?.focus(); // autofocus input-field
    this.input?.setValue(params.text); // update input value manually since @defaultValue is utilized
    this.translation = null;
    this.error = null;
    this.isLoading = true;

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
    }
  };

  @action
  onLangChange = (from: string, to: string) => {
    this.params.from = from;
    this.params.to = to;
  }

  @action
  onProviderChange = (name: ProviderCodeName) => {
    const translator = getTranslator(name);
    const supportedLanguages = translator.getSupportedLanguages({
      langFrom: this.params.from,
      langTo: this.params.to,
    });
    this.params.provider = name;
    this.params.from = supportedLanguages.langFrom;
    this.params.to = supportedLanguages.langTo;
    void this.translate();
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
                material={materialIcons.ttsPlay}
                tooltip={getMessage("popup_play_icon_title")}
                onClick={this.playText}
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

  renderTranslation() {
    const { params, isLoading, translation, error } = this;
    if (!params.text) return;
    if (isLoading) return <Spinner center/>;
    if (translation) return this.renderTranslationResult();
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
  bindInputRef(elem: Input) {
    this.input = elem;
  }

  render() {
    if (!this.params) return;
    const { textInputTranslateDelayMs: delayMs, rememberLastText } = settingsStore.data;
    const { provider, from: langFrom, to: langTo, text } = this.params;

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
            tabIndex={1}
            placeholder={getMessage("text_field_placeholder")}
            defaultValue={text}
            onChange={v => this.params.text = v}
            onKeyDown={evt => isHotkeyPressed({ key: "Enter" }, evt) && this.translate()}
            ref={this.bindInputRef}
            infoContent={(
              <small className="hint">
                {getMessage("text_input_translation_hint", {
                  hotkey: `${isMac() ? "Cmd" : "Ctrl"}+Enter`,
                  timeout: <a key="delay" onClick={this.setTranslationDelay}>{delayMs || 0}</a>,
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
      </div>
    );
  }
}

pageManager.registerComponents("translate", {
  Tab: props => <Tab {...props} label={getMessage("tab_text_input")} icon="translate"/>,
  Page: InputTranslation,
});
