import "./input-translation.scss";

import * as React from "react";
import { Translation, TranslationError, Vendor, vendors, vendorsList } from "../../vendors";
import { __i18n, MessageType, onMessage, tabs } from "../../extension";
import { connect } from "../../store/connect";
import { createStorage, cssNames } from "../../utils";
import { MaterialIcon, OptGroup, Option, Select, Spinner, TextField } from "../ui";
import { SelectLanguage } from "../select-language";
import { ISettingsState } from "../settings";
import { Favorite, favoritesActions, IFavoritesState } from "../favorites";
import { saveHistory } from "../user-history/user-history.actions";
import find = require("lodash/find");
import debounce = require("lodash/debounce");
import remove = require("lodash/remove");

const lastText = createStorage("last_text", "");

interface Props {
  settings?: ISettingsState
  favorites?: IFavoritesState
}

interface State {
  text?: string
  langFrom?: string
  langTo?: string
  vendor?: string
  loading?: boolean
  immediate?: boolean
  translation?: Translation
  error?: TranslationError
  useFavorite?: { vendor: Vendor, from: string, to: string }
}

@connect(state => ({
  settings: state.settings,
  favorites: state.favorites,
}))
export class InputTranslation extends React.Component<Props, State> {
  private textField: TextField;
  private translation: Promise<any>;
  private loadingTimer;

  public state: State = {
    text: this.props.settings.rememberLastText ? lastText() : "",
    vendor: this.props.settings.vendor,
    langFrom: this.props.settings.langFrom,
    langTo: this.props.settings.langTo,
  };

  get vendor() {
    var useFavorite = this.state.useFavorite;
    if (useFavorite) return useFavorite.vendor;
    return vendors[this.state.vendor];
  }

  get isFavorite() {
    var favorites = this.props.favorites;
    var { useFavorite, vendor, langFrom, langTo } = this.state;
    if (useFavorite) {
      let { vendor, from, to } = useFavorite;
      return !!find(favorites[vendor.name], { from, to });
    }
    return !!find(favorites[vendor], { from: langFrom, to: langTo });
  }

  async componentWillMount() {
    var activeTab = await tabs.getActive();
    tabs.sendMessage(activeTab.id, {
      type: MessageType.GET_SELECTED_TEXT
    });
    onMessage(({ payload, type }) => {
      if (type === MessageType.SELECTED_TEXT) {
        this.translateWord(payload);
      }
    });
  }

  componentDidMount() {
    if (this.state.text) this.translate();
    this.textField.focus();
  }

  addFavorite() {
    var { langFrom, langTo, vendor } = this.state;
    var fav: Favorite = { from: langFrom, to: langTo };
    var favorites = this.props.favorites;
    var favoritesByVendor = (favorites[vendor] = favorites[vendor] || []);
    if (!find(favoritesByVendor, fav)) {
      favoritesByVendor.push(fav);
      favoritesActions.sync(favorites);
    }
  }

  removeFavorite() {
    var { favorites } = this.props;
    var { useFavorite, vendor, langFrom, langTo } = this.state;
    if (useFavorite) {
      // remove actively selected favorite from the list
      let { vendor, from, to } = useFavorite;
      remove(favorites[vendor.name], { from, to });
      this.useFavorite("");
    }
    else {
      // remove current lang-pair from favorites
      remove(favorites[vendor], { from: langFrom, to: langTo });
    }
    favoritesActions.sync(favorites);
  }

  playText() {
    var { langDetected, langFrom, originalText } = this.state.translation;
    this.vendor.playText(langDetected || langFrom, originalText);
  }

  translate = (text = this.state.text.trim()) => {
    var vendor = this.vendor;
    if (!text) {
      if (vendor.isPlayingText()) vendor.stopPlaying();
      return;
    }
    var { useFavorite, langFrom, langTo } = this.state;
    if (useFavorite) {
      langFrom = useFavorite.from;
      langTo = useFavorite.to;
    }
    var translating = vendor.getTranslation(langFrom, langTo, text);
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
    var { autoPlayText, historyEnabled } = this.props.settings;
    if (autoPlayText) this.playText();
    if (historyEnabled) this.saveHistory();
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

  saveHistory() {
    var translation = this.state.translation;
    if (translation) saveHistory(translation, this.props.settings);
  }

  translateWord(text: string) {
    this.textField.focus();
    this.setState({ text });
  }

  translateLazy = debounce(() => {
    if (this.state.immediate) return;
    this.translate();
  }, 500)

  onTextChange = (text: string) => {
    if (this.props.settings.rememberLastText) lastText(text);
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
    var vendor = vendors[vendorName];
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
          {vendorsList.map(v => <Option key={v.name} value={v.name} title={v.title}/>)}
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
      var vendor = vendors[vendorName];
      if (vendor) useFavorite = { vendor, from, to };
    }
    this.setState({ useFavorite }, () => {
      this.textField.focus();
      this.translate();
    });
  };

  renderFavorites() {
    var favorites = this.props.favorites;
    var favoritesByVendors = vendorsList.filter(v => {
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
    var result = this.state.translation;
    if (!result) return null;
    var { langFrom, langTo, langDetected, translation, transcription, dictionary, spellCorrection } = result;
    var langPair = [langDetected || langFrom, langTo].join(' → ').toUpperCase();
    var langPairFull = [this.vendor.langFrom[langDetected || langFrom], this.vendor.langTo[langTo]].join(' → ');
    var title = __i18n("translated_with", [this.vendor.title, langPairFull]).join("");
    var isRTL = this.vendor.isRightToLeft(langTo);
    return (
      <div className={cssNames("translation-results", { rtl: isRTL })}>
        {translation ?
          <div className="translation flex gaps">
            <MaterialIcon
              name="play_circle_outline" title="Listen"
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
          {dictionary.map((dict, i) => {
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
        />
        {this.renderTranslation()}
      </div>
    );
  }
}
