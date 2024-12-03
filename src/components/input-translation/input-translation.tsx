import "./input-translation.scss";

import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";
import React, { Fragment } from "react";
import { action, comparer, computed, makeObservable, observable, reaction, toJS } from "mobx";
import { observer } from "mobx-react";
import { getTranslator, getTranslators, isRTL, ITranslationError, ITranslationResult } from "../../vendors";
import { getSelectedText, saveToFavoritesAction } from "../../extension/actions";
import { bindGlobalHotkey, createLogger, cssNames, disposer, SimpleHotkey } from "../../utils";
import { SelectLanguage } from "../select-language";
import { Input } from "../input";
import { Option, Select } from "../select";
import { Spinner } from "../spinner";
import { settingsStore } from "../settings/settings.storage";
import { pageManager } from "../app/page-manager";
import { Tab } from "../tabs";
import { Icon } from "../icon";
import { Tooltip } from "../tooltip";
import { getUrlParams, navigation, TranslationPageParams } from "../../navigation";
import { createStorage } from "../../storage";
import { getMessage } from "../../i18n";
import { iconMaterialFavorite, iconMaterialFavoriteOutlined, isMac } from "../../common-vars";
import { isFavorite } from "../user-history/favorites.storage";

export const lastInputText = createStorage("last_input_text", {
  defaultValue: "",
});

interface Props {
  hotkey?: SimpleHotkey;
}

@observer
export class InputTranslation extends React.Component<Props> {
  static defaultProps: Props = {
    hotkey: {
      ctrlOrCmd: true,
      key: "KeyF",
    }
  };

  private dispose = disposer();
  private logger = createLogger({ systemPrefix: "[INPUT-TRANSLATION]" });
  private input?: Input;

  @computed get urlParams(): TranslationPageParams {
    const { vendor, text, to, from } = getUrlParams<TranslationPageParams>();
    return { page: "translate", vendor, from, to, text };
  }

  @observable params: TranslationPageParams = {
    page: "translate",
    vendor: this.urlParams.vendor ?? settingsStore.data.vendor,
    from: this.urlParams.from ?? settingsStore.data.langFrom,
    to: this.urlParams.to ?? settingsStore.data.langTo,
    text: this.urlParams.text ?? "",
  }

  @observable isLoading = false;
  @observable translation?: ITranslationResult;
  @observable error?: ITranslationError;

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    await this.translateSelectedTextFromActiveWindow();

    // bind event handlers
    this.dispose.push(
      this.bindGlobalHotkey(),
      this.bindAutoSaveLatestUserInputText(),
      this.syncParamsWithUrl(),
    );
  }

  componentWillUnmount() {
    this.dispose();
  }

  // auto-translate selected text from active browser's page
  private translateSelectedTextFromActiveWindow = async () => {
    try {
      const selectedText = await getSelectedText();
      if (selectedText) {
        this.translateText(selectedText);
      }
    } catch (err) {
      this.logger.info(`cannot obtain selected text: "${err.message}"`, {
        err: err,
        origin: location.href,
      });
    }
  }

  private bindGlobalHotkey() {
    return bindGlobalHotkey(this.props.hotkey, (evt: KeyboardEvent) => {
      this.input?.focus();
    });
  }

  private syncParamsWithUrl() {
    return disposer(
      reaction(() => toJS(this.params), (params: TranslationPageParams) => {
        this.translate(); // translate text (if any)
        if (!isEqual(this.urlParams, params)) {
          navigation.searchParams.replace(params); // update url
        }
      }, {
        fireImmediately: true,
        equals: comparer.structural,
      }),

      reaction(() => this.urlParams, ({ vendor, text, to, from }) => {
        if (vendor) this.params.vendor = vendor;
        if (to) this.params.to = to;
        if (from) this.params.from = from;
        if (text) {
          this.params.text = text;
        } else {
          this.input?.setValue(""); // clear input field
        }
      }),
    )
  }

  private bindAutoSaveLatestUserInputText() {
    return disposer(
      reaction(() => this.params.text, (text: string) => {
        if (!settingsStore.data.rememberLastText) return; // exit: option is not enabled in the settings
        lastInputText.set(text);
      }, {
        delay: 250, // reduce excessive writings to underlying storage
      }),

      reaction(() => settingsStore.data.rememberLastText, rememberText => {
        if (rememberText && !this.params.text) {
          const savedUserText = lastInputText.get();
          this.translateText(savedUserText);
        }
      }, {
        fireImmediately: true, // translate previously saved input's text asap
      }),
    );
  }

  playText = () => {
    const { vendor, langDetected, originalText } = this.translation;
    getTranslator(vendor).speak(langDetected, originalText);
  }

  @action.bound
  translateText(text: string) {
    this.params.text = text;
  }

  @action
  async translate() {
    let { text, vendor, from: langFrom, to: langTo } = this.params;

    this.input?.focus(); // autofocus input-field
    this.input?.setValue(text || ""); // update input value manually since @defaultValue is utilized

    if (!text) return;

    this.logger.info("translating..", { text, vendor, langFrom, langTo });
    this.translation = null; // clear previous results immediately (if any)
    this.error = null;
    this.isLoading = true;

    try {
      this.translation = await getTranslator(vendor).translate({
        to: langTo,
        from: langFrom,
        text: text,
      })
    } catch (error) {
      this.error = error;
    } finally {
      this.isLoading = false;
    }
  };

  onInputChange = debounce(
    (text: string) => this.params.text = text.trim(),
    settingsStore.data.textInputTranslateDelayMs,
  );

  onKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    var isCmdEnter = (evt.metaKey || evt.ctrlKey) && evt.code === "Enter";
    if (isCmdEnter) {
      this.onInputChange.flush();
    }
  }

  @action
  onLangChange = (from: string, to: string) => {
    this.params.from = from;
    this.params.to = to;
  }

  @action
  onVendorChange = (name: string) => {
    var vendor = getTranslator(name);
    this.params.vendor = name;

    if (!vendor.langFrom[this.params.from]) {
      this.params.from = "auto";
    }
    if (!vendor.langTo[this.params.to]) {
      const navLang = navigator.language.split("-");
      if (vendor.langTo[navLang.join("-")]) this.params.to = navLang.join("-");
      else if (vendor.langTo[navLang[0]]) this.params.to = navLang[0];
      else this.params.to = "en";
    }
    this.input.focus();
  }

  renderTranslationResult() {
    var { langTo, langDetected, translation, transcription, dictionary, spellCorrection, sourceLanguages, vendor } = this.translation;
    var translator = getTranslator(vendor);
    var favorite = isFavorite(this.translation);

    return (
      <div className={cssNames("translation-results", { rtl: isRTL(langTo) })}>
        {translation ?
          <div className="translation flex gaps align-center">
            <Icon
              material="play_circle_outline"
              title={getMessage("popup_play_icon_title")}
              onClick={this.playText}
            />
            <div className="value box grow">
              <span>{translation}</span>
              {transcription ? <i className="transcription">[{transcription}]</i> : null}
            </div>
            <div className="flex column center">
              <Icon
                material={favorite ? iconMaterialFavorite : iconMaterialFavoriteOutlined}
                tooltip={favorite ? getMessage("history_unmark_as_favorite") : getMessage("history_mark_as_favorite")}
                onClick={() => saveToFavoritesAction(this.translation, { isFavorite: !favorite })}
              />
              <div className="lang" id="translated_with">
                {translator.getLangPairShortTitle(langDetected, langTo)}
                <Tooltip htmlFor="translated_with" following nowrap>
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
              suggestion: <b className="link" onClick={() => this.translateText(spellCorrection)}>{spellCorrection}</b>
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
                  var examples = meaning.examples
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
                          var last = i === list.length - 1;
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
    var { statusCode, message } = this.error;
    return (
      <div className="translation-error flex column gaps">
        <p>{statusCode}: {getMessage("translation_data_failed")}</p>
        <p dangerouslySetInnerHTML={{ __html: message }}/>
      </div>
    );
  }

  renderTranslation() {
    var { params, isLoading, translation, error } = this;
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

  render() {
    var { textInputTranslateDelayMs: delayMs, rememberLastText } = settingsStore.data;
    var { vendor, from: langFrom, to: langTo, text } = this.params;

    return (
      <div className="InputTranslation flex column gaps">
        <div className="language flex gaps">
          <SelectLanguage
            vendor={vendor} from={langFrom} to={langTo}
            onChange={({ langTo, langFrom }) => this.onLangChange(langFrom, langTo)}
          />
          <Select value={vendor} onChange={this.onVendorChange}>
            {getTranslators().map(v => <Option key={v.name} value={v.name} label={v.title}/>)}
          </Select>
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
            onChange={(text: string) => this.onInputChange(text)}
            onKeyDown={this.onKeyDown}
            ref={input => this.input = input}
            infoContent={(
              <small className="hint">
                {getMessage("text_input_translation_hint", {
                  hotkey: `${isMac() ? "Cmd" : "Ctrl"}+Enter`,
                  timeout: <a onClick={this.setTranslationDelay}>{delayMs || 0}</a>,
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
