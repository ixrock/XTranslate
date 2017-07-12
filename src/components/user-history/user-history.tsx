import "./user-history.scss";

import * as React from "react";
import { connect } from "../../store/connect";
import { __i18n } from "../../extension/i18n";
import { cssNames, download, prevDefault } from "../../utils";
import { Button, Checkbox, MaterialIcon, Menu, MenuItem, Option, Select, Spinner, TextField } from "../ui";
import { ISettingsState, settingsActions } from "../settings";
import { clearHistory, getHistory } from "./user-history.actions";
import { IHistoryItem } from "./user-history.types";
import { vendors } from "../../vendors/index";
import debounce = require("lodash/debounce");
import groupBy = require("lodash/groupBy");

interface Props {
  settings?: ISettingsState
}

interface State {
  history?: IHistoryItem[]
  loading?: boolean
  page?: number
  pageSize?: number
  hasMore?: boolean
  clearPeriod?: HistoryPeriod
  showDetails?: { [itemId: string]: boolean }
  showSettings?: boolean
  showSearch?: boolean
  searchText?: string
}

enum HistoryPeriod {
  HOUR, DAY, MONTH, YEAR, ALL
}

@connect(store => ({
  settings: store.settings
}))
export class UserHistory extends React.Component<Props, State> {
  public state: State = {
    history: [],
    page: 0,
    pageSize: 100,
    clearPeriod: HistoryPeriod.DAY,
    showDetails: {},
    searchText: "",
    showSettings: false,
    showSearch: false,
  };

  async componentWillMount() {
    this.setState({ loading: true });
    await this.loadHistory();
    this.setState({ loading: false });
  }

  async loadHistory(reset = false) {
    try {
      var { page, pageSize, history, searchText } = this.state;
      var historyResults = await getHistory(searchText);
      if (reset) {
        page = 0;
        history = [];
      }
      var removedItemsOffset = page * pageSize - history.length;
      history.push(
        ...historyResults.slice(
          page * pageSize - removedItemsOffset,
          page * pageSize + pageSize
        )
      )
      this.setState({
        page: page + 1,
        hasMore: historyResults.length > history.length,
        history
      });
    } catch (e) {
    }
  }

  reloadHistory() {
    this.setState(() => this.loadHistory(true));
  }

  reloadHistoryOnSearch = debounce(() => {
    this.reloadHistory();
  }, 500)

  search(text: string) {
    this.setState({ searchText: text }, this.reloadHistoryOnSearch);
  }

  async exportHistory(type: "json" | "csv") {
    var filename = `xtranslate-history.${type}`;
    var history = await getHistory(this.state.searchText);
    switch (type) {
      case "json":
        var json = history.map(item => {
          var ts = item.transcription;
          return {
            date: new Date(item.date).toLocaleString(),
            lang: `${item.from}-${item.to}`,
            translator: item.vendor,
            text: item.text,
            translation: item.translation + (ts ? ` (${ts})` : ""),
            dictionary: item.dictionary.reduce((result, dict) => {
              result[dict.wordType] = dict.translation;
              return result;
            }, {})
          }
        });
        download.json(filename, json)
        break;

      case "csv":
        var csv = [
          ["Date", "Translator", "Language", "Original text", "Translation", "Transcription", "Dictionary"]
        ];
        history.forEach(item => {
          csv.push([
            new Date(item.date).toLocaleString(),
            vendors[item.vendor].title,
            item.from + "-" + item.to,
            item.text,
            item.translation,
            item.transcription || "",
            item.dictionary.map(({ wordType, translation }) => {
              return wordType + "\n" + translation.join(", ")
            }).join("\n\n")
          ]);
        });
        download.csv(filename, csv);
        break;
    }
  }

  getPeriod(timestamp: number, period?: HistoryPeriod) {
    var d = new Date(timestamp);
    var date = [d.getFullYear(), d.getMonth(), d.getDate()];
    var time = [d.getHours(), d.getMinutes(), d.getSeconds()];
    if (period === HistoryPeriod.HOUR) date = date.concat(time[0]);
    if (period === HistoryPeriod.MONTH) date = date.slice(0, 2);
    if (period === HistoryPeriod.YEAR) date = date.slice(0, 1);
    return date.join("-");
  }

  async clearHistory() {
    var { history, clearPeriod } = this.state;
    if (!history.length) return;
    try {
      var datePeriod = this.getPeriod(history[0].date, clearPeriod);
      var clearAll = clearPeriod === HistoryPeriod.ALL;
      var clearFilter = (item: IHistoryItem) => {
        return datePeriod === this.getPeriod(item.date, clearPeriod);
      };
      await clearHistory(clearAll ? null : clearFilter);
      this.reloadHistory();
    } catch (e) {
    }
  }

  removeItem(item: IHistoryItem) {
    var history = this.state.history;
    var index = history.indexOf(item);
    clearHistory(item.id).then(() => {
      history.splice(index, 1);
      this.setState({ history });
    });
  }

  toggleDetails(itemId: string) {
    var showDetails = Object.assign({}, this.state.showDetails);
    showDetails[itemId] = !showDetails[itemId];
    this.setState({ showDetails });
  }

  playText(vendor: string, lang: string, text: string) {
    vendors[vendor].playText(lang, text);
  }

  renderHistory() {
    var { history, showDetails } = this.state;
    if (!history || !history.length) return null;
    var groupedHistory = groupBy(history, item => new Date(item.date).toDateString());
    var historyDays = Object.keys(groupedHistory);
    return (
      <ul className="history">
        {historyDays.map(day => {
          return React.Children.toArray([
            <li className="history-date">{day}</li>,
            ...groupedHistory[day].map(item => {
              var { id, vendor, from, to, text, translation, transcription } = item;
              var openDetails = showDetails[id];
              var translatedWith = __i18n("translated_with", [
                vendor[0].toUpperCase() + vendor.substr(1),
                [from, to].join(" → ").toUpperCase()
              ]).join("");
              var rtlClass = {
                rtl: vendors[vendor].isRightToLeft(to)
              };
              return (
                <li key={id} title={translatedWith}
                    className={cssNames("history-item", { open: openDetails })}
                    onClick={() => this.toggleDetails(id)}>
                  <div className="main-info flex gaps">
                    <span className="text box grow flex align-center">
                      {openDetails ?
                        <MaterialIcon
                          className="mr1"
                          name="play_circle_outline"
                          onClick={prevDefault(() => this.playText(vendor, from, text))}
                        /> : null}
                      <span className="text">{text}</span>
                      {transcription ? <span className="transcription">({transcription})</span> : null}
                    </span>
                    <span className={cssNames("translation box grow", rtlClass)}>{translation}</span>
                    <MaterialIcon
                      name="remove_circle_outline" className="remove-icon"
                      onClick={prevDefault(() => this.removeItem(item))}
                    />
                  </div>
                  {openDetails ? this.renderDetails(item, rtlClass) : null}
                </li>
              );
            })
          ]);
        })}
      </ul>
    );
  }

  renderDetails(item: IHistoryItem, rtlClass?: object) {
    var dict = item.dictionary;
    if (!dict.length) return null;
    return (
      <div className="details flex gaps auto">
        {dict.map(dict => {
          var wordType = dict.wordType;
          return (
            <div key={wordType} className={cssNames("dictionary", rtlClass)}>
              <b className="word-type">{wordType}</b>
              <div className="translations">
                {dict.translation.join(", ")}
              </div>
            </div>
          )
        })}
      </div>
    );
  }

  render() {
    var { history, loading, clearPeriod, hasMore } = this.state;
    var { showSettings, showSearch, searchText } = this.state;
    var { historyEnabled, historyAvoidDuplicates, historySaveWordsOnly } = this.props.settings;
    return (
      <div className="UserHistory">
        <div className="flex align-center justify-center">
          <Checkbox
            label={__i18n("history_enabled_flag")}
            checked={historyEnabled}
            onChange={v => settingsActions.sync({ historyEnabled: v })}
          />
          <MaterialIcon
            name="find_in_page"
            active={showSearch}
            onClick={() => this.setState({ showSearch: !showSearch })}
          />
          <div className="flex">
            <MaterialIcon id="export_history" name="file_download" button/>
            <Menu htmlFor="export_history">
              <MenuItem onClick={() => this.exportHistory("csv")}>
                {__i18n("history_export_entries", ["CSV"])}
              </MenuItem>
              <MenuItem spacer/>
              <MenuItem onClick={() => this.exportHistory("json")}>
                {__i18n("history_export_entries", ["JSON"])}
              </MenuItem>
            </Menu>
          </div>
          <MaterialIcon
            name="settings"
            active={showSettings}
            onClick={() => this.setState({ showSettings: !showSettings })}
          />
        </div>
        {showSearch && (
          <TextField
            autoFocus showErrors={false}
            className="mt1"
            placeholder={__i18n("history_search_input_placeholder")}
            value={searchText} onChange={v => this.search(v)}
          />
        )}
        {showSettings && (
          <div className="settings flex column gaps mt1">
            <div className="flex gaps align-center">
              <Select className="box grow" value={clearPeriod} onChange={v => this.setState({ clearPeriod: v })}>
                <Option value={HistoryPeriod.HOUR} title={__i18n("history_clear_period_hour")}/>
                <Option value={HistoryPeriod.DAY} title={__i18n("history_clear_period_day")}/>
                <Option value={HistoryPeriod.MONTH} title={__i18n("history_clear_period_month")}/>
                <Option value={HistoryPeriod.ALL} title={__i18n("history_clear_period_all")}/>
              </Select>
              <Button
                accent label={__i18n("history_button_clear")}
                onClick={() => this.clearHistory()}
              />
            </div>
            <div className="box flex gaps auto">
              <Checkbox
                label={__i18n("history_settings_save_words_only")}
                checked={historySaveWordsOnly}
                onChange={v => settingsActions.sync({ historySaveWordsOnly: v })}
              />
              <Checkbox
                label={__i18n("history_settings_avoid_duplicates")}
                checked={historyAvoidDuplicates}
                onChange={v => settingsActions.sync({ historyAvoidDuplicates: v })}
              />
            </div>
          </div>
        )}
        {loading && <div className="pt1"><Spinner center/></div>}
        {history && this.renderHistory()}
        {hasMore && (
          <div className="load-more flex center mt2">
            <Button
              primary label={__i18n("history_button_show_more")}
              onClick={() => this.loadHistory()}
            />
          </div>
        )}
      </div>
    );
  }
}
