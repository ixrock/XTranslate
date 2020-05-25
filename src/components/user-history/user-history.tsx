import "./user-history.scss";

import * as React from "react";
import { groupBy } from "lodash";
import { computed, observable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { cssNames, download, prevDefault } from "../../utils";
import { getTranslator, isRTL } from "../../vendors";
import { Checkbox } from "../checkbox";
import { MenuActions, MenuItem } from "../menu";
import { FileInput, ImportingFile, Input, NumberInput } from "../input";
import { Option, Select } from "../select";
import { Button } from "../button";
import { Spinner } from "../spinner";
import { settingsStore } from "../settings/settings.store";
import { viewsManager } from "../app/views-manager";
import { HistoryTimeFrame, IHistoryItem, IHistoryStorageItem, toHistoryItem, userHistoryStore } from "./user-history.store";
import { Notifications } from "../notifications";
import { AppPageId } from "../../navigation";
import { Icon } from "../icon";
import { Tab } from "../tabs";

@observer
export class UserHistory extends React.Component {
  private showDetailsMap = new WeakMap<IHistoryStorageItem, boolean>();

  @observable page = 1;
  @observable showSettings = false;
  @observable showSearch = false;
  @observable showImportExport = false;
  @observable searchText = "";
  @observable searchedText = "";
  @observable timeFrame = HistoryTimeFrame.DAY;

  @disposeOnUnmount
  searchChangeDisposer = reaction(() => this.searchText, text => {
    this.searchedText = text; // update with delay to avoid freezing ui with big history data
  }, { delay: 500 })

  @computed get items() {
    if (this.searchedText) return userHistoryStore.findItems(this.searchedText);
    return userHistoryStore.data.slice(0, this.page * settingsStore.data.historyPageSize);
  }

  @computed get hasMore() {
    if (this.searchedText) return false;
    return userHistoryStore.data.length > this.items.length;
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
    var date = new Date().toISOString().replace(/:/g, "_");
    var filename = `xtranslate-history-${date}.${type}`;
    var items = this.searchText ? this.items : userHistoryStore.data;
    switch (type) {
      case "json":
        download.json(filename, items);
        break;

      case "csv":
        var csvRows = [
          ["Date", "Translator", "Language", "Text", "Translation", "Transcription", "Dictionary"]
        ];
        items.map(toHistoryItem).forEach(item => {
          csvRows.push([
            new Date(item.date).toLocaleString(),
            getTranslator(item.vendor).title,
            item.from + "-" + item.to,
            item.text,
            item.translation,
            item.transcription || "",
            item.dictionary.map(({ wordType, translation }) => {
              return wordType + ": " + translation.join(", ")
            }).join("\n")
          ]);
        });
        download.csv(filename, csvRows);
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
    var latestItem = toHistoryItem(userHistoryStore.data[0]);
    var latestFrame = getTimeFrame(latestItem.date, timeFrame);
    var clearFilter = (item: IHistoryItem) => latestFrame === getTimeFrame(item.date, timeFrame);
    userHistoryStore.clear(clearAll ? null : clearFilter);
  }

  playText = (vendor: string, lang: string, text: string) => {
    getTranslator(vendor).playText(lang, text);
  }

  renderHistory() {
    var items = this.items.map(item => ({
      storageItem: item,
      historyItem: toHistoryItem(item),
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
              {groupedItems[day].map(({ historyItem, storageItem }, groupIndex) => {
                var { date, vendor, from, to, text, translation, transcription } = historyItem;
                var showDetails = this.showDetailsMap.has(storageItem);
                var translatedWith = __i18n("translated_with", [
                  vendor[0].toUpperCase() + vendor.substr(1),
                  [from, to].join(" → ").toUpperCase()
                ]).join("");
                var rtlClass = { rtl: isRTL(to) };
                return (
                  <li key={groupIndex}
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

  onImport = async (files: ImportingFile[]) => {
    var historyItems: IHistoryStorageItem[] = [];
    files.forEach(({ file, data, error }) => {
      if (error) {
        Notifications.error(__i18n("history_import_file_error", [
          file.name, error
        ]));
        return;
      }
      try {
        historyItems.push(...JSON.parse(data));
      } catch (err) {
        console.error(`Parsing "${file.name}" has failed:`, err);
      }
    });
    var count = await userHistoryStore.importItems(historyItems);
    Notifications.ok(__i18n("history_import_success", count));
  }

  render() {
    var { timeFrame, showSettings, showSearch, showImportExport, searchText, hasMore, clearItemsByTimeFrame } = this;
    var { historyEnabled, historyAvoidDuplicates, historySaveWordsOnly, historyPageSize } = settingsStore.data;
    var { isLoading, isLoaded } = userHistoryStore;
    return (
      <div className="UserHistory">
        <FileInput
          id="import-history"
          accept="application/json"
          onImport={this.onImport}
        />
        <div className="settings flex gaps align-center justify-center">
          <Checkbox
            label={__i18n("history_enabled_flag")}
            checked={historyEnabled}
            onChange={v => settingsStore.data.historyEnabled = v}
          />
          <div className="actions">
            <Icon
              material="search"
              tooltip={!showSearch ? __i18n("history_icon_tooltip_search") : undefined}
              className={cssNames({ active: showSearch })}
              onClick={() => this.showSearch = !showSearch}
            />
            <MenuActions
              onOpen={() => this.showImportExport = true}
              onClose={() => this.showImportExport = false}
              triggerIcon={{
                material: "import_export",
                tooltip: !showImportExport ? __i18n("history_icon_tooltip_imp_exp") : undefined,
              }}
            >
              <MenuItem htmlFor="import-history">
                {__i18n("history_import_entries", ["JSON"])}
              </MenuItem>
              <MenuItem spacer/>
              <MenuItem onClick={() => this.exportHistory("json")}>
                {__i18n("history_export_entries", ["JSON"])}
              </MenuItem>
              <MenuItem onClick={() => this.exportHistory("csv")}>
                {__i18n("history_export_entries", ["CSV"])}
              </MenuItem>
            </MenuActions>
            <Icon
              material="settings"
              tooltip={!showSettings ? __i18n("history_icon_tooltip_settings") : undefined}
              className={cssNames({ active: showSettings })}
              onClick={() => this.showSettings = !showSettings}
            />
          </div>
        </div>
        <div className="settings-content flex column gaps">
          {showSearch && (
            <Input
              autoFocus
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
                  checked={historySaveWordsOnly}
                  onChange={v => settingsStore.data.historySaveWordsOnly = v}
                />
                <Checkbox
                  label={__i18n("history_settings_avoid_duplicates")}
                  checked={historyAvoidDuplicates}
                  onChange={v => settingsStore.data.historyAvoidDuplicates = v}
                />
                <div className="page-size flex gaps align-center">
                  <span className="box grow">{__i18n("history_page_size")}</span>
                  <NumberInput
                    step={10} min={10} max={100000}
                    value={historyPageSize}
                    onChange={v => settingsStore.data.historyPageSize = v}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        {isLoading && <div className="loading"><Spinner/></div>}
        {isLoaded && this.renderHistory()}
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

viewsManager.registerView(AppPageId.history, {
  Tab: props => <Tab {...props} label={__i18n("tab_history")} icon="history"/>,
  Page: UserHistory,
});
