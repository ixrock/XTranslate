import "./input-translation.scss";

import { debounce, isEqual } from "lodash";
import React, { Fragment } from "react";
import { action, comparer, computed, makeObservable, observable, reaction } from "mobx";
import { observer } from "mobx-react";
import { getTranslator, getTranslators, isRTL, ITranslationError, ITranslationResult } from "../../vendors";
import { getSelectedText, saveToFavorites } from "../../extension/actions";
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
import { getUrlParams, navigate, navigation, TranslationPageParams } from "../../navigation";
import { createStorageHelper } from "../../extension/storage";
import { getMessage } from "../../i18n";
import { iconMaterialFavorite, iconMaterialFavoriteOutlined, isMac } from "../../common-vars";
import { isFavorite } from "../user-history/favorites.storage";

export const lastInputText = createStorageHelper("last_input_text", {
  autoSyncDelay: 0,
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
  private logger = createLogger();
  private input?: Input;

  @computed get urlParams(): TranslationPageParams {
    const { vendor, text, to, from } = getUrlParams<TranslationPageParams>();
    return { vendor, text, to, from, page: "translate" };
  }

  @computed get params(): TranslationPageParams {
    const { vendor, text, langTo, langFrom } = this;
    return { vendor, text, to: langTo, from: langFrom, page: "translate" };
  }

  @observable vendor: string = this.urlParams.vendor ?? settingsStore.data.vendor;
  @observable langFrom: string = this.urlParams.from ?? settingsStore.data.langFrom;
  @observable langTo: string = this.urlParams.to ?? settingsStore.data.langTo;
  @observable text = this.urlParams.text ?? "";
  @observable isLoading = false;
  @observable translation?: ITranslationResult;
  @observable error?: ITranslationError;

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    await lastInputText.load();

    // auto-translate selected text (if any) from active browser's page
    const selectedText = await getSelectedText();
    if (selectedText) {
      this.translateText(selectedText);
    }

    // bind event handlers
    this.dispose.push(
      this.bindGlobalHotkey(),
      this.bindTranslationOnUrlParamsChange(),
      this.bindTranslationOnParamsChange(),
      this.bindAutoSaveLatestUserInputText()
    );
  }

  componentWillUnmount() {
    this.dispose();
  }

  private bindGlobalHotkey() {
    return bindGlobalHotkey(this.props.hotkey, (evt: KeyboardEvent) => {
      this.input?.focus();
    });
  }

  private bindTranslationOnUrlParamsChange() {
    return reaction(() => this.urlParams, ({ vendor, text, to, from }) => {
      if (isEqual(this.urlParams, this.params)) {
        return;
      }
      this.vendor = vendor ?? settingsStore.data.vendor;
      this.langFrom = from ?? settingsStore.data.langFrom;
      this.langTo = to ?? settingsStore.data.langTo;
      this.text = text ?? "";
    });
  }

  private bindTranslationOnParamsChange() {
    return reaction(() => this.params, () => {
      this.translate();

      if (this.params.text && !isEqual(this.params, this.urlParams)) {
        navigation.searchParams.replace(this.params); // update url
      }
    }, {
      equals: comparer.structural,
      fireImmediately: true,
    });
  };

  private bindAutoSaveLatestUserInputText() {
    return disposer(...[
      reaction(() => this.text, (text: string) => {
        if (!settingsStore.data.rememberLastText) return; // exit: option is not enabled in the settings
        lastInputText.set(text);
      }, {
        delay: 250, // reduce excessive writings to underlying storage
      }),

      reaction(() => settingsStore.data.rememberLastText, rememberText => {
        if (rememberText && !this.text) {
          const savedUserText = lastInputText.get();
          this.translateText(savedUserText);
        }
      }, {
        fireImmediately: true, // translate previously saved input's text asap
      }),
    ]);
  }

  playText = () => {
    const { vendor, langDetected, originalText } = this.translation;
    getTranslator(vendor).speak(langDetected, originalText);
  }

  @action
  translateText(text: string) {
    this.input.focus();
    this.text = text;
    this.input.setValue(text); // update input value manually since @defaultValue is utilized
  }

  @action
  async translate() {
    let { text, vendor, langFrom, langTo } = this;
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
    (text: string) => this.text = text.trim(),
    settingsStore.data.textInputTranslateDelayMs,
  );

  onKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    var isCmdEnter = (evt.metaKey || evt.ctrlKey) && evt.keyCode === 13;
    if (isCmdEnter) {
      this.onInputChange.flush();
    }
  }

  @action
  onLangChange = (from: string, to: string) => {
    this.langFrom = from;
    this.langTo = to;
  }

  @action
  onVendorChange = (name: string) => {
    var vendor = getTranslator(name);
    this.vendor = name;

    if (!vendor.langFrom[this.langFrom]) {
      this.langFrom = "auto";
    }
    if (!vendor.langTo[this.langTo]) {
      const navLang = navigator.language.split("-");
      if (vendor.langTo[navLang.join("-")]) this.langTo = navLang.join("-");
      else if (vendor.langTo[navLang[0]]) this.langTo = navLang[0];
      else this.langTo = "en";
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
                onClick={() => saveToFavorites(this.translation, { isFavorite: !favorite })}
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
                <b key={lang} className="link" onClick={action(() => this.langFrom = lang)}>
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
                          this.langFrom = langTo;
                          this.langTo = langDetected;
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
    var { text, isLoading, translation, error } = this;
    if (!text) return;
    if (isLoading) return <Spinner center/>;
    if (translation) return this.renderTranslationResult();
    if (error) return this.renderTranslationError();
  }

  render() {
    var { textInputTranslateDelayMs: delayMs, rememberLastText } = settingsStore.data;
    var { vendor, langFrom, langTo } = this;

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
            defaultValue={this.text}
            onChange={(text: string) => this.onInputChange(text)}
            onKeyDown={this.onKeyDown}
            ref={input => this.input = input}
            infoContent={(
              <small className="hint">
                {getMessage("text_input_translation_hint", {
                  hotkey: `${isMac() ? "Cmd" : "Ctrl"}+Enter`,
                  timeout: <a onClick={() => navigate({ page: "settings" })}>{delayMs}</a>,
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
