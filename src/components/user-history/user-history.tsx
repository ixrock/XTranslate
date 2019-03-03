import "./user-history.scss";

import * as React from "react";
import { computed, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { groupBy } from "lodash";
import { __i18n } from "../../extension/i18n";
import { cssNames, download, prevDefault } from "../../utils";
import { getVendorByName } from "../../vendors";
import { Checkbox } from "../checkbox";
import { Menu, MenuItem } from "../menu";
import { TextField } from "../text-field";
import { Option, Select } from "../select";
import { Button } from "../button";
import { Spinner } from "../spinner";
import { settingsStore } from "../settings/settings.store";
import { HistoryTimeFrame, IHistoryItem, IHistoryStorageItem, userHistoryStore } from "./user-history.store";
import { Icon } from "../icon";

@observer
export class UserHistory extends React.Component {
  settings = settingsStore.data;
  showDetailsMap = new WeakMap<IHistoryStorageItem, boolean>();

  @observable page = 1;
  @observable showSettings = false;
  @observable showSearch = false;
  @observable searchText = "";
  @observable searchedText = "";
  @observable timeFrame = HistoryTimeFrame.DAY;

  @disposeOnUnmount
  searchChangeDisposer = reaction(() => this.searchText, text => {
    this.searchedText = text; // update with delay to avoid freezing ui with big history data
  }, { delay: 500 })

  @computed get items() {
    if (this.searchedText) return userHistoryStore.findItems(this.searchedText);
    return userHistoryStore.items.slice(0, this.page * this.settings.historyPageSize);
  }

  @computed get hasMore() {
    if (this.searchedText) return false;
    return userHistoryStore.items.length > this.items.length;
  }

  componentDidMount() {
    userHistoryStore.load();
  }

  toggleDetails(item: IHistoryStorageItem) {
    if (this.showDetailsMap.has(item)) {
      this.showDetailsMap.delete(item);
    }
    else {
      this.showDetailsMap.set(item, true)
    }
    this.forceUpdate();
  }

  exportHistory(type: "json" | "csv") {
    var filename = `xtranslate-history.${type}`;
    var history = this.items.map(userHistoryStore.toHistoryItem);
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
            getVendorByName(item.vendor).title,
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

  clearItem = (item: IHistoryStorageItem) => {
    userHistoryStore.clear(item);
  }

  clearItemsByTimeFrame = () => {
    var { items, timeFrame } = this;
    if (!items.length) return;
    var getTimeFrame = (timestamp: number, frame?: HistoryTimeFrame) => {
      var d = new Date(timestamp);
      var date = [d.getFullYear(), d.getMonth(), d.getDate()];
      var time = [d.getHours(), d.getMinutes(), d.getSeconds()];
      if (frame === HistoryTimeFrame.HOUR) date = date.concat(time[0]);
      if (frame === HistoryTimeFrame.MONTH) date = date.slice(0, 2);
      if (frame === HistoryTimeFrame.YEAR) date = date.slice(0, 1);
      return date.join("-");
    }
    var clearAll = timeFrame === HistoryTimeFrame.ALL;
    var latestItem = userHistoryStore.toHistoryItem(userHistoryStore.items[0]);
    var latestFrame = getTimeFrame(latestItem.date, timeFrame);
    var clearFilter = (item: IHistoryItem) => latestFrame === getTimeFrame(item.date, timeFrame);
    userHistoryStore.clear(clearAll ? null : clearFilter);
  }

  playText = (vendor: string, lang: string, text: string) => {
    getVendorByName(vendor).playText(lang, text);
  }

  renderHistory() {
    var items = this.items.map(item => ({
      storageItem: item,
      historyItem: userHistoryStore.toHistoryItem(item),
    }));
    var groupedItems = groupBy(items, item => {
      return new Date(item.historyItem.date).toDateString();
    });
    return (
      <ul className="history">
        {Object.keys(groupedItems).map(day => {
          return (
            <React.Fragment key={day}>
              <li className="history-date">{day}</li>
              {groupedItems[day].map(({ historyItem, storageItem }) => {
                var { date, vendor, from, to, text, translation, transcription } = historyItem;
                var showDetails = this.showDetailsMap.has(storageItem);
                var translatedWith = __i18n("translated_with", [
                  vendor[0].toUpperCase() + vendor.substr(1),
                  [from, to].join(" → ").toUpperCase()
                ]).join("");
                var rtlClass = {
                  rtl: getVendorByName(vendor).isRightToLeft(to)
                };
                return (
                  <li key={date}
                      title={translatedWith}
                      className={cssNames("history-item", { open: showDetails })}
                      onClick={() => this.toggleDetails(storageItem)}>
                    <div className="main-info flex gaps">
                    <span className="text box grow flex gaps align-center">
                      {showDetails && (
                        <Icon
                          material="play_circle_outline"
                          onClick={prevDefault(() => this.playText(vendor, from, text))}
                        />
                      )}
                      <span className="text">{text}</span>
                      {transcription ? <span className="transcription">({transcription})</span> : null}
                    </span>
                      <span className={cssNames("translation box grow", rtlClass)}>{translation}</span>
                      <Icon
                        className="remove-icon"
                        material="remove_circle_outline"
                        onClick={prevDefault(() => this.clearItem(storageItem))}
                      />
                    </div>
                    {showDetails ? this.renderDetails(historyItem, rtlClass) : null}
                  </li>
                );
              })}
            </React.Fragment>
          )
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
    var { loading, loaded } = userHistoryStore;
    var { timeFrame, showSettings, showSearch, searchText, hasMore, clearItemsByTimeFrame } = this;
    var { historyEnabled, historyAvoidDuplicates, historySaveWordsOnly, historyPageSize } = this.settings;
    return (
      <div className="UserHistory">
        <div className="settings flex align-center justify-center">
          <Checkbox
            label={__i18n("history_enabled_flag")}
            value={historyEnabled}
            onChange={v => this.settings.historyEnabled = v}
          />
          <Icon
            material="find_in_page"
            className={cssNames({ active: showSearch })}
            onClick={() => this.showSearch = !showSearch}
          />
          <div className="flex">
            <Icon id="export_history" material="file_download" actionIcon/>
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
          <Icon
            material="settings"
            className={cssNames({ active: showSettings })}
            onClick={() => this.showSettings = !showSettings}
          />
        </div>
        <div className="settings-content flex column gaps">
          {showSearch && (
            <TextField
              autoFocus showErrors={false}
              placeholder={__i18n("history_search_input_placeholder")}
              value={searchText}
              onChange={v => this.searchText = v}
            />
          )}
          {showSettings && (
            <div className="flex column gaps">
              <div className="flex gaps align-center">
                <Select className="box grow" value={timeFrame} onChange={v => this.timeFrame = v}>
                  <Option value={HistoryTimeFrame.HOUR} label={__i18n("history_clear_period_hour")}/>
                  <Option value={HistoryTimeFrame.DAY} label={__i18n("history_clear_period_day")}/>
                  <Option value={HistoryTimeFrame.MONTH} label={__i18n("history_clear_period_month")}/>
                  <Option value={HistoryTimeFrame.ALL} label={__i18n("history_clear_period_all")}/>
                </Select>
                <Button
                  accent label={__i18n("history_button_clear")}
                  onClick={clearItemsByTimeFrame}
                />
              </div>
              <div className="box flex gaps auto align-center">
                <Checkbox
                  label={__i18n("history_settings_save_words_only")}
                  value={historySaveWordsOnly}
                  onChange={v => this.settings.historySaveWordsOnly = v}
                />
                <Checkbox
                  label={__i18n("history_settings_avoid_duplicates")}
                  value={historyAvoidDuplicates}
                  onChange={v => this.settings.historyAvoidDuplicates = v}
                />
                <div className="page-size flex gaps align-center">
                  <span className="box grow">{__i18n("history_page_size")}</span>
                  <TextField
                    type="number" min={10} max={100000}
                    value={historyPageSize} showErrors={false}
                    onChange={v => this.settings.historyPageSize = v}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        {loading && <div className="loading"><Spinner/></div>}
        {loaded && this.renderHistory()}
        {hasMore && (
          <div className="load-more flex center">
            <Button
              primary label={__i18n("history_button_show_more")}
              onClick={() => this.page++}
            />
          </div>
        )}
      </div>
    );
  }
}
