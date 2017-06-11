import "./input-translation.scss";

import * as React from "react";
import { Translation, TranslationError, Vendor, vendors, vendorsList } from "../../vendors";
import { autobind, debounce } from "core-decorators";
import { __i18n, MessageType, onMessage, tabs } from "../../extension";
import { connect } from "../../store/connect";
import { createStorage, cssNames, prevDefault } from "../../utils";
import { MaterialIcon, Option, Select, Spinner, TextField } from "../ui";
import { SelectLanguage } from "../select-language";
import { ISettingsState } from "../settings";
import { Favorite, favoritesActions, IFavoritesState } from "../favorites";
import { saveHistory } from "../user-history/user-history.actions";

import clone = require("lodash/clone");
import find = require("lodash/find");
import remove = require("lodash/remove");
import orderBy = require("lodash/orderBy");

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
}

@connect(state => ({
  settings: state.settings,
  favorites: state.favorites,
}))
export class InputTranslation extends React.Component<Props, State> {
  private textField: TextField;
  private translation: Promise<Translation>;
  private loadingTimer;

  public state: State = {
    text: this.props.settings.rememberLastText ? lastText() : "",
    vendor: this.props.settings.vendor,
    langFrom: this.props.settings.langFrom,
    langTo: this.props.settings.langTo,
  };

  get vendor() {
    return vendors[this.state.vendor];
  }

  get isFavorite() {
    var favorites = this.props.favorites;
    var { vendor, langFrom, langTo } = this.state;
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

  @autobind()
  addFavorites() {
    var { langFrom, langTo } = this.state;
    var vendor = vendors[this.state.vendor];
    var favorites = clone(this.props.favorites);
    if (!vendor) return;
    var fav: Favorite = { from: langFrom, to: langTo };
    var vendorFavorites = favorites[vendor.name] || (favorites[vendor.name] = []);
    if (!find(vendorFavorites, fav)) {
      vendorFavorites.push(fav);
      favoritesActions.sync(favorites);
    }
  }

  @autobind()
  removeFavorite(vendor: Vendor, fav: Favorite) {
    var favorites = clone(this.props.favorites);
    var vendorFavorites = favorites[vendor.name] || [];
    if (find(vendorFavorites, fav)) {
      remove(vendorFavorites, fav);
      favoritesActions.sync(favorites);
    }
  }

  @autobind()
  playText() {
    var { langDetected, langFrom, originalText } = this.state.translation;
    this.vendor.playText(langDetected || langFrom, originalText);
  }

  @autobind()
  @debounce(0)
  translate(text = this.state.text.trim()) {
    if (!text) return;
    var { langFrom, langTo } = this.state;
    var translating = this.vendor.getTranslation(langFrom, langTo, text);
    this.handleTranslation(translating);
  }

  @autobind()
  translateWithFavorite(vendor: Vendor, fav: Favorite) {
    var text = this.state.text;
    if (text) {
      this.textField.focus();
      var translation = vendor.getTranslation(fav.from, fav.to, text);
      this.handleTranslation(translation);
    }
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

  @autobind()
  onTranslationReady() {
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

  @autobind()
  @debounce(500)
  translateLazy() {
    if (this.state.immediate) return;
    this.translate();
  }

  @autobind()
  onTextChange(text: string) {
    if (this.props.settings.rememberLastText) lastText(text);
    this.setState({ text, immediate: false }, this.translateLazy);
    if (!text.trim()) {
      this.setState({ translation: null });
    }
  }

  @autobind()
  onKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
    var meta = evt.metaKey || evt.ctrlKey;
    var enter = evt.keyCode === 13;
    if (enter && meta) {
      this.setState({ immediate: true });
      this.translate();
    }
  }

  @autobind()
  onVendorChange(vendorName: string) {
    var { langFrom, langTo } = this.state;
    var state = { vendor: vendorName } as State;
    var vendor = vendors[vendorName];
    if (!vendor.langFrom[langFrom]) state.langFrom = Object.keys(vendor.langFrom)[0];
    if (!vendor.langTo[langTo]) state.langTo = Object.keys(vendor.langTo)[0];
    this.setState(state, this.translate);
  }

  @autobind()
  onLangChange(langFrom, langTo) {
    var state = Object.assign({}, this.state);
    if (langFrom) state.langFrom = langFrom;
    if (langTo) state.langTo = langTo;
    this.setState(state, this.translate);
  }

  @autobind()
  onSwapLang(langFrom, langTo) {
    this.setState({ langFrom, langTo }, this.translate);
  }

  renderHeader() {
    var { vendor, langFrom, langTo } = this.state;
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
        {this.isFavorite ?
          <MaterialIcon
            name="favorite" title={__i18n("favorites_remove_item")}
            onClick={() => this.removeFavorite(this.vendor, { from: langFrom, to: langTo })}/>
          : null}
        {!this.isFavorite ?
          <MaterialIcon
            name="favorite_border" title={__i18n("favorites_add_item")}
            onClick={this.addFavorites}/>
          : null}
      </div>
    )
  }

  renderFavorites() {
    var favorites = this.props.favorites;
    var favoriteVendors = Object.keys(favorites);
    var favCount = favoriteVendors.reduce((count, vendor) => count + favorites[vendor].length, 0);
    if (!favCount) return null;
    return (
      <div className="favorites">
        <p className="sub-title">{__i18n("sub_header_favorites")}</p>
        <div className="flex auto">
          {favoriteVendors.map(vendorName => {
            var vendor = vendors[vendorName];
            var vendorFavorites: Favorite[] = orderBy(favorites[vendorName], [
              (fav: Favorite) => fav.from !== 'auto',
              'from'
            ]);
            var vendorIconClass = cssNames("fav-vendor-icon flex align-center justify-center", vendorName);
            if (!vendorFavorites.length) return null;
            return (
              <div key={vendorName} className="favorite">
                <span className={vendorIconClass} title={vendor.title}>{vendor.title[0]}</span>
                {vendorFavorites.map((fav: Favorite) => {
                  var { from, to } = fav;
                  var key = [from, to].join('-');
                  var title = [vendor.langFrom[from], vendor.langTo[to]].join(' → ');
                  return (
                    <div key={key} className="favorite-lang flex align-center"
                         onClick={() => this.translateWithFavorite(vendor, fav)}>
                      <div className="box grow flex align-center" title={title}>
                        <span className="fav-lang-from">{from.toUpperCase()}</span>
                        <MaterialIcon name={"keyboard_arrow_right"}/>
                        <span className="fav-lang-to">{to.toUpperCase()}</span>
                      </div>
                      <MaterialIcon
                        name="remove_circle_outline" className="fav-remove-icon"
                        title={__i18n("favorites_remove_item")}
                        onClick={prevDefault(() => this.removeFavorite(vendor, fav))}/>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <hr className="mv1"/>
      </div>
    );
  }

  renderResult() {
    var result = this.state.translation;
    if (!result) return null;
    var { langFrom, langTo, langDetected, translation, transcription, dictionary } = result;
    var langPair = [langDetected || langFrom, langTo].join(' → ').toUpperCase();
    var langPairFull = [this.vendor.langFrom[langDetected || langFrom], this.vendor.langTo[langTo]].join(' → ');
    var title = __i18n("translated_with", [this.vendor.title, langPairFull]).join("");
    var isRTL = this.vendor.isRightToLeft(langTo);
    return (
      <div className={cssNames("translation-results", { rtl: isRTL })}>
        {translation ?
          <div className="translation flex gaps">
            <MaterialIcon name="play_circle_outline" title="Listen" onClick={this.playText}/>
            <div className="value box grow">
              <span>{translation}</span>
              {transcription ? <i className="transcription">[{transcription}]</i> : null}
            </div>
            <span className="lang" title={title}>{langPair}</span>
          </div>
          : null}
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
