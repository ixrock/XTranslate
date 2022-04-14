import "./input-translation.scss";

import { debounce } from "lodash";
import React, { Fragment } from "react";
import { action, comparer, makeObservable, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { getTranslator, getTranslators, isRTL, ITranslationError, ITranslationResult } from "../../vendors";
import { getSelectedText } from "../../extension/actions";
import { createLogger, cssNames, isMac } from "../../utils";
import { SelectLanguage } from "../select-language";
import { Input } from "../input";
import { Option, Select } from "../select";
import { Spinner } from "../spinner";
import { settingsStore } from "../settings/settings.storage";
import { pageManager } from "../app/page-manager";
import { Tab } from "../tabs";
import { Icon } from "../icon";
import { Tooltip } from "../tooltip";
import { navigate } from "../../navigation";
import { createStorageHelper } from "../../extension/storage";
import { getMessage } from "../../i18n";

export const lastInputText = createStorageHelper("last_input_text", {
  defaultValue: "",
});

@observer
export class InputTranslation extends React.Component {
  private logger = createLogger();
  private inputRef = React.createRef<Input>();

  @observable vendor: string = settingsStore.data.vendor;
  @observable langFrom: string = settingsStore.data.langFrom;
  @observable langTo: string = settingsStore.data.langTo;
  @observable text = "";
  @observable isLoading = false;
  @observable translation?: ITranslationResult;
  @observable error?: ITranslationError;

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  get input(): Input {
    return this.inputRef.current;
  }

  async componentDidMount() {
    this.input.focus();
    this.bindAutoTranslateOnParamsChange();
    this.bindAutoSaveLatestUserInputText();

    // auto-translate selected text from active tab
    const selectedText = await getSelectedText();
    if (selectedText) this.translateText(selectedText);
  }

  bindAutoTranslateOnParamsChange = () => {
    return disposeOnUnmount(this, [
      reaction(() => [this.text, this.vendor, this.langTo, this.langFrom], this.translate, {
        equals: comparer.structural,
      }),
    ]);
  };

  bindAutoSaveLatestUserInputText = () => {
    return disposeOnUnmount(this, [
      reaction(() => this.text, (text: string) => {
        if (!settingsStore.data.rememberLastText) {
          return; // exit: option is not enabled in the settings
        }

        if (lastInputText.get() !== text) {
          this.logger.info("saving last user input", { input: text });
          lastInputText.set(text);
        }
      }, {
        delay: 250, // reduce excessive writings to underlying storage
      }),

      reaction(() => settingsStore.data.rememberLastText, rememberText => {
        if (rememberText) {
          const savedUserText = lastInputText.get();
          this.translateText(savedUserText);
        }
      }, {
        fireImmediately: true, // translate previously saved input's text asap
      }),
    ])
  }

  playText = () => {
    const { vendor, langDetected, originalText } = this.translation;
    getTranslator(vendor).speak(langDetected, originalText);
  }

  @action.bound
  translateText(text: string) {
    this.input.focus();
    this.text = text;
    this.input.setValue(text); // update input value manually since @defaultValue is utilized
  }

  @action
  translate = async () => {
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
    var { langTo, langDetected, translation, transcription, dictionary, spellCorrection, vendor } = this.translation;
    var translator = getTranslator(vendor);
    return (
      <div className={cssNames("translation-results", { rtl: isRTL(langTo) })}>
        {translation ?
          <div className="translation flex gaps align-flex-start">
            <Icon
              material="play_circle_outline"
              title={getMessage("popup_play_icon_title")}
              onClick={this.playText}
            />
            <div className="value box grow">
              <span>{translation}</span>
              {transcription ? <i className="transcription">[{transcription}]</i> : null}
            </div>
            <span className="lang" id="translated_with">
              {translator.getLangPairShortTitle(langDetected, langTo)}
              <Tooltip htmlFor="translated_with" following nowrap>
                {getMessage("translated_with", {
                  translator: translator.title,
                  lang: translator.getLangPairTitle(langDetected, langTo),
                })}
              </Tooltip>
            </span>
          </div>
          : null}
        {spellCorrection ? (
          <div className="spell-correction">
            {getMessage("spell_correction", {
              suggestion: <b className="link" onClick={() => this.translateText(spellCorrection)}>
                {spellCorrection}
              </b>
            })}
          </div>
        ) : null}
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
                        {meaning.word}
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
        <p>{message}</p>
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
        <div className="input-area flex gaps align-center">
          <Input
            autoFocus={true}
            multiLine={true}
            rows={2}
            tabIndex={1}
            placeholder={getMessage("text_field_placeholder")}
            defaultValue={this.text}
            onChange={(text: string) => this.onInputChange(text)}
            onKeyDown={this.onKeyDown}
            ref={this.inputRef}
            infoContent={(
              <small className="hint">
                {getMessage("text_input_translation_hint", {
                  hotkey: `${isMac ? "Cmd" : "Ctrl"}+Enter`,
                  timeout: <a onClick={() => navigate({ page: "settings" })}>{delayMs}</a>,
                })}
              </small>
            )}
          />
          <Icon
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
