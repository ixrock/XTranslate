import "./input-translation.scss";

import * as React from "react";
import { observer } from "mobx-react";
import { getVendorByName, Translation, TranslationError, Vendor, vendors } from "../../vendors";
import { __i18n, MessageType, onMessage, tabs } from "../../extension";
import { createStorage, cssNames, isMac } from "../../utils";
import { SelectLanguage } from "../select-language";
import { TextField } from "../text-field";
import { OptGroup, Option, Select } from "../select";
import { MaterialIcon } from "../icons";
import { Spinner } from "../spinner";
import { settingsStore } from "../settings/settings.store";
import { Favorite, favoritesStore } from "./favorites.store";
import { AppRoute } from "../app/app.route";
import { userHistoryStore } from "../user-history/user-history.store";
import find = require("lodash/find");
import debounce = require("lodash/debounce");
import remove = require("lodash/remove");

const lastText = createStorage("last_text", "");

interface State {
  text?: string
  langFrom?: string
  langTo?: string
  vendor?: string
  loading?: boolean
  immediate?: boolean
  translation?: Translation
  error?: TranslationError
  useFavorite?: {
    vendor: Vendor,
    from: string,
    to: string
  }
}

@observer
export class InputTranslation extends React.Component<{}, State> {
  settings = settingsStore.data;

  private textField: TextField;
  private translation: Promise<any>;
  private loadingTimer;

  public state: State = {
    text: this.settings.rememberLastText ? lastText() : "",
    vendor: this.settings.vendor,
    langFrom: this.settings.langFrom,
    langTo: this.settings.langTo,
  };

  get vendor() {
    var useFavorite = this.state.useFavorite;
    if (useFavorite) return useFavorite.vendor;
    return getVendorByName(this.state.vendor);
  }

  get isFavorite() {
    var { useFavorite, vendor, langFrom, langTo } = this.state;
    if (useFavorite) {
      let { vendor, from, to } = useFavorite;
      return !!find(favoritesStore.getByVendor(vendor.name), { from, to });
    }
    return !!find(favoritesStore.getByVendor(vendor), { from: langFrom, to: langTo });
  }

  async componentDidMount() {
    var activeTab = await tabs.getActive();
    tabs.sendMessage(activeTab.id, {
      type: MessageType.GET_SELECTED_TEXT
    });
    onMessage(({ payload, type }) => {
      if (type === MessageType.SELECTED_TEXT) {
        this.translateWord(payload);
      }
    });
    if (this.state.text) this.translate();
    this.textField.focus();
  }

  saveFavorites(vendor: string, favorites: Favorite[]) {
    favoritesStore.data[vendor] = favorites;
  }

  addFavorite() {
    var { langFrom, langTo, vendor } = this.state;
    var fav: Favorite = { from: langFrom, to: langTo };
    var favorites: Favorite[] = favoritesStore.getByVendor(vendor);
    if (!find(favorites, fav)) {
      this.saveFavorites(vendor, [...favorites, fav]);
    }
  }

  removeFavorite() {
    var { useFavorite, vendor, langFrom, langTo } = this.state;
    if (useFavorite) {
      // remove actively selected favorite from the list
      let { vendor, from, to } = useFavorite;
      let favorites = favoritesStore.getByVendor(vendor.name);
      remove(favorites, { from, to });
      this.saveFavorites(vendor.name, favorites);
      this.useFavorite("");
    }
    else {
      // remove current lang-pair from favorites
      let favorites = favoritesStore.getByVendor(vendor);
      remove(favorites, { from: langFrom, to: langTo });
      this.saveFavorites(vendor, favorites);
    }
  }

  playText() {
    var { langDetected, langFrom, originalText } = this.state.translation;
    this.vendor.playText(langDetected || langFrom, originalText);
  }

  translate = (text = this.state.text.trim()) => {
    if (!text) {
      if (this.vendor.isPlayingText()) {
        this.vendor.stopPlaying();
      }
      return;
    }
    var { useFavorite, langFrom, langTo } = this.state;
    if (useFavorite) {
      langFrom = useFavorite.from;
      langTo = useFavorite.to;
    }
    var translating = this.vendor.getTranslation(langFrom, langTo, text);
    this.handleTranslation(translating);
  }

  private handleTranslation(translation: Promise<Translation>) {
    this.setLoading();
    var text = this.state.text;
    var promise = this.translation = translation.then(result => {
      if (this.translation !== promise || !text) return; // update state only with latest request
      this.setState({ translation: result, error: null }, this.onTranslationReady);
      return result;
    }).catch(error => {
      if (this.translation !== promise) return;
      this.setState({ translation: null, error: error });
    });
  }

  onTranslationReady = () => {
    var translation = this.state.translation;
    var { autoPlayText, historyEnabled } = this.settings;
    if (autoPlayText) this.playText();
    if (historyEnabled) userHistoryStore.saveTranslation(translation);
  }

  // show loading indicator only for long delays
  setLoading() {
    clearTimeout(this.loadingTimer);
    this.loadingTimer = setTimeout(() => {
      var ready = () => this.setState({ loading: false });
      this.setState({ loading: true });
      this.translation.then(ready, ready);
    }, 1000);
  }

  translateWord(text: string) {
    this.textField.focus();
    this.setState({ text });
  }

  translateLazy = debounce(() => {
    if (this.state.immediate) return;
    this.translate();
  }, this.settings.textInputTranslateDelayMs)

  onTextChange = (text: string) => {
    if (this.settings.rememberLastText) lastText(text);
    this.setState({ text, immediate: false }, this.translateLazy);
    if (!text.trim()) {
      this.setState({ translation: null });
    }
  }

  onKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    var meta = evt.metaKey || evt.ctrlKey;
    var enter = evt.keyCode === 13;
    if (enter && meta) {
      this.setState({ immediate: true });
      this.translate();
    }
  }

  onVendorChange = (vendorName: string) => {
    var { langFrom, langTo } = this.state;
    var state = { vendor: vendorName } as State;
    var vendor = getVendorByName(vendorName);
    if (!vendor.langFrom[langFrom]) state.langFrom = Object.keys(vendor.langFrom)[0];
    if (!vendor.langTo[langTo]) state.langTo = Object.keys(vendor.langTo)[0];
    this.setState(state, this.translate);
  }

  onLangChange = (langFrom: string, langTo: string) => {
    var state = Object.assign({}, this.state);
    if (langFrom) state.langFrom = langFrom;
    if (langTo) state.langTo = langTo;
    this.setState(state, this.translate);
  }

  onSwapLang = (langFrom: string, langTo: string) => {
    this.setState({ langFrom, langTo }, this.translate);
  }

  renderHeader() {
    var { vendor } = this.state;
    var isFavorite = this.isFavorite;
    return (
      <div className="language flex gaps">
        <SelectLanguage
          className="box grow"
          onChangeLang={this.onLangChange}
          onSwapLang={this.onSwapLang}
        />
        <Select value={vendor} onChange={this.onVendorChange}>
          {vendors.map(v => <Option key={v.name} value={v.name} title={v.title}/>)}
        </Select>
        {isFavorite ?
          <MaterialIcon
            name="favorite" title={__i18n("favorites_remove_item")}
            onClick={() => this.removeFavorite()}/>
          : null}
        {!isFavorite ?
          <MaterialIcon
            name="favorite_border" title={__i18n("favorites_add_item")}
            onClick={() => this.addFavorite()}/>
          : null}
      </div>
    )
  }

  useFavorite = (value: string) => {
    var useFavorite = null;
    if (value) {
      var [vendorName, from, to] = value.split("-");
      var vendor = getVendorByName(vendorName);
      if (vendor) useFavorite = { vendor, from, to };
    }
    this.setState({ useFavorite }, () => {
      this.textField.focus();
      this.translate();
    });
  };

  renderFavorites() {
    var favorites = favoritesStore.data;
    var favoritesByVendors = vendors.filter(v => {
      return favorites[v.name] && favorites[v.name].length > 0
    }).map(v => {
      return {
        vendor: v,
        favorites: favorites[v.name]
      }
    });
    if (!favoritesByVendors.length) return null;
    return (
      <div className="favorites flex gaps align-flex-start">
        <Select className="box grow" onChange={this.useFavorite}>
          <Option value="" title={`${__i18n("favorites_translate_with")}`}/>
          {favoritesByVendors.map(favList => {
            var { vendor, favorites } = favList;
            return (
              <OptGroup key={vendor.name} label={vendor.title}>
                {favorites.map(fav => {
                  var { from, to } = fav;
                  var langPair = [from, to].join("-").toUpperCase();
                  var title = [vendor.langFrom[from], vendor.langTo[to]].join(' → ');
                  var value = [vendor.name, from, to].join("-");
                  return <Option key={langPair} title={title} value={value}/>
                })}
              </OptGroup>
            )
          })}
        </Select>
      </div>
    );
  }

  renderResult() {
    var { translation: result } = this.state;
    if (!result) return null;
    var { langFrom, langTo, langDetected, translation, transcription, dictionary, spellCorrection } = result;
    if (langDetected) langFrom = langDetected;
    var langPair = [langFrom, langTo].join(' → ').toUpperCase();
    var langPairFull = [this.vendor.langFrom[langFrom], this.vendor.langTo[langTo]].join(' → ');
    var title = __i18n("translated_with", [this.vendor.title, langPairFull]).join("");
    var isRTL = this.vendor.isRightToLeft(langTo);
    var canPlayText = this.vendor.canPlayText(langFrom, translation);
    return (
      <div className={cssNames("translation-results", { rtl: isRTL })}>
        {translation ?
          <div className="translation flex gaps">
            <MaterialIcon
              name="play_circle_outline"
              title={__i18n("popup_play_icon_title")}
              disabled={!canPlayText}
              onClick={() => this.playText()}
            />
            <div className="value box grow">
              <span>{translation}</span>
              {transcription ? <i className="transcription">[{transcription}]</i> : null}
            </div>
            <span className="lang" title={title}>{langPair}</span>
          </div>
          : null}
        {spellCorrection ? (
          <div className="spell-correction">
            {__i18n("spell_correction", React.Children.toArray([
              <b className="link" onClick={() => this.translateWord(spellCorrection)}>
                {spellCorrection}
              </b>
            ]))}
          </div>
        ) : null}
        <table className="dictionary">
          <tbody>
          {dictionary.map((dict) => {
            return React.Children.toArray([
              <tr>
                <td className="word-type" colSpan={2}>{dict.wordType}</td>
              </tr>,
              dict.meanings.map(meaning => {
                var examples = meaning.examples
                  ? meaning.examples.map(example => example.join(" - ")).join("\n")
                  : "";
                return (
                  <tr>
                    <td className="word">
                      {meaning.word}
                      {examples ? <span className="examples" title={examples}>*</span> : null}
                    </td>
                    <td className="word-meanings">
                      {meaning.translation.map((word, i, list) => {
                        var last = i === list.length - 1;
                        return [
                          <span key={i} className="link" onClick={() => this.translateWord(word)}>{word}</span>,
                          !last ? ", " : null
                        ];
                      })}
                    </td>
                  </tr>
                );
              })
            ])
          })}
          </tbody>
        </table>
      </div>
    )
  }

  renderError() {
    if (!this.state.error) return null;
    var { status, statusText } = this.state.error;
    return (
      <div className="translation-error">
        {status} - {statusText}
      </div>
    );
  }

  renderTranslation() {
    var { text, loading, translation, error } = this.state;
    if (!text) return;
    if (loading) return <Spinner center/>;
    if (translation) return this.renderResult();
    if (error) return this.renderError();
  }

  render() {
    var { textInputTranslateDelayMs } = this.settings;
    return (
      <div className="InputTranslation">
        {this.renderHeader()}
        {this.renderFavorites()}
        <TextField
          placeholder={__i18n("text_field_placeholder")}
          autoFocus multiLine rows={2} tabIndex={1}
          maxLength={this.vendor.maxTextInputLength}
          value={this.state.text} onChange={v => this.onTextChange(v)}
          onKeyDown={this.onKeyDown}
          ref={e => this.textField = e}
        >
          <div className="info">
            {__i18n("text_input_translation_hint", React.Children.toArray([
              `${isMac ? "Cmd" : "Ctrl"}+Enter`,
              <a href={AppRoute.settings}>{textInputTranslateDelayMs}ms</a>
            ]))}
          </div>
        </TextField>
        {this.renderTranslation()}
      </div>
    );
  }
}
