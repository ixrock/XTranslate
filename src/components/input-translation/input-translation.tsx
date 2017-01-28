require('./input-translation.scss');
import * as React from 'react';
import { vendors, vendorsList, Translation, TranslationError, Vendor } from '../../vendors'
import { autobind, debounce } from "core-decorators";
import { __i18n } from "../../extension/i18n";
import { connect } from "../../store/connect";
import { cssNames, prevDefault } from "../../utils";
import { TextField, Select, Option, MaterialIcon, Spinner } from '../ui'
import { SelectLanguage } from '../select-language'
import { ISettingsState } from '../settings'
import { IFavoritesState, Favorite, favoritesActions } from '../favorites'
import { saveHistory } from "../user-history/user-history.actions";
import clone = require("lodash/clone");
import find = require("lodash/find");
import remove = require("lodash/remove");
import orderBy = require("lodash/orderBy");

interface Props {
  settings?: ISettingsState
  favorites?: IFavoritesState
}

interface State {
  langFrom?: string
  langTo?: string
  vendor?: string
  loading?: boolean
  translation?: Translation
  error?: TranslationError
}

@connect(state => ({
  settings: state.settings,
  favorites: state.favorites,
}))
export class InputTranslation extends React.Component<Props, State> {
  private textField: TextField;
  public settings = this.props.settings;
  private translation: Promise<Translation>;
  private loadingTimer;

  public state: State = {
    vendor: this.settings.vendor,
    langFrom: this.settings.langFrom,
    langTo: this.settings.langTo,
  };

  get text() {
    return (this.textField.value as string).trim();
  }

  get vendor() {
    return vendors[this.state.vendor];
  }

  get isFavorite() {
    var favorites = this.props.favorites;
    var { vendor, langFrom, langTo } = this.state;
    return !!find(favorites[vendor], { from: langFrom, to: langTo });
  }

  componentDidMount() {
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
    return (
        <div className="translation-results">
          {translation ?
              <div className="flex">
                <MaterialIcon name="play_circle_outline" title="Listen" onClick={this.playText}/>
                <div className="translation box grow">
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
    var { status, statusText, error } = this.state.error;
    return (
        <div className="translation-error">
          {status} - {statusText}
        </div>
    );
  }

  @autobind()
  playText() {
    var { langDetected, langFrom, originalText } = this.state.translation;
    this.vendor.playText(langDetected || langFrom, originalText);
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

  @autobind()
  @debounce(0)
  translate(text = this.text) {
    if (!text) return;
    var { langFrom, langTo } = this.state;
    var translating = this.vendor.getTranslation(langFrom, langTo, text);
    this.handleTranslation(translating);
  }

  @autobind()
  translateWithFavorite(vendor: Vendor, fav: Favorite) {
    this.textField.focus();
    if (!this.text) return;
    var translation = vendor.getTranslation(fav.from, fav.to, this.text);
    this.handleTranslation(translation);
  }

  private handleTranslation(translation: Promise<Translation>) {
    this.setLoading();
    var promise = this.translation = translation.then(result => {
      if (this.translation !== promise || !this.text) return; // update state only with latest request
      this.setState({ translation: result, error: null }, this.onTranslationReady);
      return result;
    }).catch(error => {
      if (this.translation !== promise) return;
      this.setState({ translation: null, error: error });
    });
  }

  @autobind()
  onTranslationReady() {
    var { autoPlayText, historyEnabled } = this.settings;
    if (autoPlayText) this.playText();
    if (historyEnabled) this.saveHistory();
  }

  // wait some time before saving history to avoid a lot of intermediate text inputs
  @debounce(1500)
  saveHistory() {
    var translation = this.state.translation;
    if (translation) saveHistory(translation);
  }

  translateWord(text: string) {
    this.translate(text);
    this.textField.value = text;
    this.textField.focus();
  }

  @debounce(250)
  translateLazy(text) {
    this.translate(text);
  }

  @autobind()
  onTextChange(text: string) {
    text = text.trim();
    if (!text) this.setState({ translation: null });
    else this.translateLazy(text);
  }

  @autobind()
  onVendorChange(vendorName: string) {
    var { langFrom, langTo } = this.state;
    var state: State = { vendor: vendorName };
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

  render() {
    var { vendor, langFrom, langTo, loading, error } = this.state;
    return (
        <div className="InputTranslation">
          <div className="language flex gaps">
            <SelectLanguage className="box grow" onChangeLang={this.onLangChange}/>
            <Select value={vendor} onChange={this.onVendorChange}>
              {vendorsList.map(v => <Option key={v.name} value={v.name} title={v.title}/>)}
            </Select>
            {this.isFavorite ?
                <MaterialIcon
                    name="favorite" title={__i18n("favorites_remove_item")}
                    onClick={() => this.removeFavorite(this.vendor, {from: langFrom, to: langTo})}/>
                : null}
            {!this.isFavorite ?
                <MaterialIcon
                    name="favorite_border" title={__i18n("favorites_add_item")}
                    onClick={this.addFavorites}/>
                : null}
          </div>
          {this.renderFavorites()}
          <TextField
              placeholder={__i18n("text_field_placeholder")}
              autoFocus multiLine rows={2} maxLength={this.vendor.maxTextInputLength}
              onChange={v => this.onTextChange(v)} tabIndex={1}
              ref={e => this.textField = e}/>
          {loading ? <Spinner center/> : (error ? this.renderError() : this.renderResult())}
        </div>
    );
  }
}

export default InputTranslation;