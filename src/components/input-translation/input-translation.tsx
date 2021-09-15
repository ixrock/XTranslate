import "./input-translation.scss";

import React, { Fragment } from "react";
import { action, computed, makeObservable, observable, reaction, toJS } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { getTranslator, getTranslators, isRTL, ITranslationError, ITranslationResult } from "../../vendors";
import { getActiveTabText, translateText, ttsPlay, ttsStop } from "../../extension/actions";
import { cssNames, isMac } from "../../utils";
import { SelectLanguage } from "../select-language";
import { Input } from "../input";
import { Option, OptionsGroup, Select } from "../select";
import { Spinner } from "../spinner";
import { settingsStore } from "../settings/settings.storage";
import { favoritesStore } from "./favorites.storage";
import { viewsManager } from "../app/views-manager";
import { Tab } from "../tabs";
import { Icon } from "../icon";
import { Tooltip } from "../tooltip";
import { navigate } from "../../navigation";
import { createStorageHelper } from "../../extension/storage";
import { getMessage } from "../../i18n";

export const lastInputText = createStorageHelper("last_input_text", {
  defaultValue: "",
});

interface TranslateParams {
  vendor: string;
  langFrom: string;
  langTo: string;
}

@observer
export class InputTranslation extends React.Component {
  public input: Input;
  public translateTimer;

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  @observable isLoading = false;
  @observable text = "";
  @observable translation?: ITranslationResult;
  @observable error?: ITranslationError;
  @observable favorite?: TranslateParams;

  @observable params: TranslateParams = {
    vendor: settingsStore.data.vendor,
    langFrom: settingsStore.data.langFrom,
    langTo: settingsStore.data.langTo,
  };

  @computed get isFavorite() {
    if (this.favorite) return true;
    var { vendor, langFrom, langTo } = this.params;
    return favoritesStore.isFavorite(vendor, langFrom, langTo);
  }

  get activeVendor() {
    var name = this.favorite ? this.favorite.vendor : this.params.vendor;
    return getTranslator(name)
  }

  async componentDidMount() {
    this.input.focus();

    // auto-translate text when input params has changed
    disposeOnUnmount(this, [
      reaction(() => toJS(this.params), this.translate),
      reaction(() => toJS(this.favorite), this.translate),
    ]);

    // restore last input text if enabled in options
    if (settingsStore.data.rememberLastText) {
      await lastInputText.whenReady;
      this.translateText(lastInputText.get() ?? "");
    }

    // auto-translate selected text from active tab
    var selectedText = await getActiveTabText();
    if (selectedText) this.translateText(selectedText);
  }

  componentWillUnmount() {
    ttsStop();
  }

  addFavorite = () => {
    var { langFrom, langTo, vendor } = this.params;
    favoritesStore.addFavorite(vendor, {
      from: langFrom,
      to: langTo
    });
  }

  removeFavorite = () => {
    var { vendor, langFrom, langTo } = this.favorite || this.params;
    favoritesStore.removeFavorite(vendor, {
      from: langFrom,
      to: langTo
    });
    this.clearFavorite();
  }

  removeAllFavorites = () => {
    favoritesStore.reset();
    this.clearFavorite();
  }

  clearFavorite = () => {
    this.favorite = null;
  }

  playText = () => {
    if (!this.translation) return;
    ttsPlay(this.translation);
  }

  @action
  translate = async () => {
    const text = this.text.trim();
    if (!text) return;
    var { vendor, langFrom, langTo } = this.favorite || this.params;
    try {
      this.error = null;
      this.isLoading = true;
      this.translation = await translateText({
        from: langFrom,
        to: langTo,
        vendor, text,
      });
    } catch (err) {
      this.translation = null;
      this.error = err;
    } finally {
      this.isLoading = false;
    }
  }

  @action
  translateText = (text: string) => {
    this.input.focus();
    this.text = text;
    this.translate();
  }

  translateImmediate = () => {
    clearTimeout(this.translateTimer);
    this.translate();
  }

  @action
  onTextChange = (text: string) => {
    this.text = text;
    var { rememberLastText, textInputTranslateDelayMs } = settingsStore.data;
    if (rememberLastText) {
      lastInputText.set(text);
    }
    if (!text) {
      ttsStop();
      this.translation = null;
      this.error = null;
    }
    clearTimeout(this.translateTimer);
    this.translateTimer = setTimeout(this.translate, textInputTranslateDelayMs);
  }

  onKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    var isCmdEnter = (evt.metaKey || evt.ctrlKey) && evt.keyCode === 13;
    if (isCmdEnter) {
      this.translateImmediate();
    }
  }

  onLangChange = (from: string, to: string) => {
    this.params.langFrom = from;
    this.params.langTo = to;
    this.clearFavorite();
  }

  onVendorChange = (vendorName: string) => {
    var vendor = getTranslator(vendorName);
    var { langFrom, langTo } = this.params;
    if (!vendor.langFrom[langFrom]) {
      this.params.langFrom = "auto";
    }
    if (!vendor.langTo[langTo]) {
      var navLang = navigator.language.split("-")[0];
      this.params.langTo = vendor.langTo[navLang] ? navLang : "en";
    }
    this.params.vendor = vendorName;
    this.clearFavorite();
  }

  renderHeader() {
    var { isFavorite } = this;
    var { vendor, langFrom, langTo } = this.params;
    return (
      <div className="language flex gaps">
        <SelectLanguage
          vendor={vendor}
          from={langFrom}
          to={langTo}
          onChange={this.onLangChange}
        />
        <Select value={vendor} onChange={this.onVendorChange}>
          {getTranslators().map(v => <Option key={v.name} value={v.name} label={v.title}/>)}
        </Select>
        {isFavorite && (
          <Icon
            material="favorite"
            tooltip={{ nowrap: true, children: getMessage("favorites_remove_item") }}
            onClick={this.removeFavorite}
          />
        )}
        {!isFavorite ?
          <Icon
            material="favorite_border"
            tooltip={{ nowrap: true, children: getMessage("favorites_add_item") }}
            onClick={this.addFavorite}/>
          : null}
      </div>
    )
  }

  renderFavorites() {
    var { getCount, getFavorites } = favoritesStore;
    if (!getCount()) return;
    return (
      <div className="favorites flex gaps">
        <Select
          className="box grow"
          value={this.favorite}
          onChange={(v: TranslateParams) => this.favorite = v}
        >
          <Option value="" label={`${getMessage("favorites_translate_with")}`}/>
          {getFavorites().map(({ vendor, favorites }) => {
            return (
              <OptionsGroup key={vendor.name} label={vendor.title}>
                {favorites.map(fav => {
                  var { from, to } = fav;
                  var value: TranslateParams = {
                    vendor: vendor.name,
                    langFrom: from,
                    langTo: to,
                  };
                  return (
                    <Option
                      key={[vendor.name, from, to].join("-")}
                      value={value}
                      label={`${vendor.langFrom[from]} → ${vendor.langTo[to]} (${vendor.title})`}
                    />
                  )
                })}
              </OptionsGroup>
            )
          })}
        </Select>
        <Icon
          material="clear"
          tooltip={{ nowrap: true, children: getMessage("favorites_clear_all") }}
          onClick={this.removeAllFavorites}
        />
      </div>
    );
  }

  renderResult() {
    var { langFrom, langTo, langDetected, translation, transcription, dictionary, spellCorrection } = this.translation;
    var vendor = getTranslator(this.translation.vendor);
    if (langDetected) langFrom = langDetected;
    var langPair = [langFrom, langTo].join(' → ').toUpperCase();
    var langPairFull = [vendor.langFrom[langFrom], vendor.langTo[langTo]].join(' → ');
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
              {langPair}
              <Tooltip htmlFor="translated_with" following nowrap>
                {getMessage("translated_with", { translator: vendor.title, lang: langPairFull })}
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

  renderError() {
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
    if (translation) return this.renderResult();
    if (error) return this.renderError();
  }

  render() {
    var { textMaxLength } = this.activeVendor;
    var { textInputTranslateDelayMs: delayMs } = settingsStore.data;
    return (
      <div className="InputTranslation flex column gaps">
        {this.renderHeader()}
        {this.renderFavorites()}
        <Input
          autoFocus
          multiLine rows={2} tabIndex={1}
          placeholder={getMessage("text_field_placeholder")}
          maxLength={textMaxLength}
          value={this.text}
          onChange={this.onTextChange}
          onKeyDown={this.onKeyDown}
          ref={e => this.input = e}
          infoContent={(
            <small className="hint">
              {getMessage("text_input_translation_hint", {
                hotkey: `${isMac ? "Cmd" : "Ctrl"}+Enter`,
                timeout: <a onClick={() => navigate({ page: "settings" })}>{delayMs}</a>,
              })}
            </small>
          )}
        />
        {this.renderTranslation()}
      </div>
    );
  }
}

viewsManager.registerPages("translate", {
  Tab: props => <Tab {...props} label={getMessage("tab_text_input")} icon="translate"/>,
  Page: InputTranslation,
});
