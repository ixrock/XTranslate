import "./user-history.scss";

import * as React from "react";
import { debounce, groupBy } from "lodash";
import { computed, observable } from "mobx";
import { observer } from "mobx-react";
import { __i18n } from "../../extension/i18n";
import { ttsPlay } from "../../extension/actions";
import { cssNames, download, prevDefault } from "../../utils";
import { getTranslator, isRTL } from "../../vendors";
import { Checkbox } from "../checkbox";
import { MenuActions, MenuItem } from "../menu";
import { FileInput, ImportingFile, Input, NumberInput } from "../input";
import { Option, Select } from "../select";
import { Button } from "../button";
import { settingsStore } from "../settings/settings.storage";
import { viewsManager } from "../app/views-manager";
import { IHistoryItem, IHistoryItemId, IHistoryStorageItem, toStorageItem, historyStore } from "./history.storage";
import { Notifications } from "../notifications";
import { Icon } from "../icon";
import { Tab } from "../tabs";

enum HistoryTimeFrame {
  HOUR,
  DAY,
  MONTH,
  YEAR,
  ALL,
}

@observer
export class UserHistory extends React.Component {
  private itemDetailsEnabled = observable.map<IHistoryItemId, boolean>();
  public searchInput: Input;

  @observable page = 1;
  @observable showSettings = false;
  @observable showSearch = false;
  @observable showImportExport = false;
  @observable clearTimeFrame = HistoryTimeFrame.DAY;
  @observable searchText = "";

  @computed get pageSize() {
    return this.page * settingsStore.data.historyPageSize;
  }

  @computed get items(): IHistoryItem[] {
    if (this.searchText) return this.searchedItems;
    return historyStore.items;
  }

  @computed get searchedItems() {
    return historyStore.searchItems(this.searchText);
  }

  @computed get groupedItems(): Record<string, IHistoryItem[]> {
    var pageItems = this.items.slice(0, this.pageSize);
    return groupBy(pageItems, item => new Date(item.date).toLocaleDateString());
  }

  @computed get hasMore(): boolean {
    return this.items.length > this.pageSize;
  }

  protected onSearchChange = debounce((searchQuery: string) => {
    this.searchText = searchQuery.trim();
  }, 500);

  toggleDetails(itemId: IHistoryItemId) {
    var { itemDetailsEnabled: map } = this;
    if (map.has(itemId)) {
      map.delete(itemId);
    } else {
      map.set(itemId, true)
    }
  }

  exportHistory(type: "json" | "csv") {
    var date = new Date().toISOString().replace(/:/g, "_");
    var filename = `xtranslate-history-${date}.${type}`;
    var { items } = this;
    switch (type) {
      case "json":
        download.json(filename, items.map(toStorageItem));
        break;

      case "csv":
        var csvRows = [
          ["Date", "Translator", "Language", "Text", "Translation", "Transcription", "Dictionary"]
        ];
        items.forEach(item => {
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

  clearById = (id?: IHistoryItemId) => {
    historyStore.clear(id);
  }

  clearByTimeFrame = () => {
    var { clearTimeFrame } = this;
    var getTimeFrame = (timestamp: number, frame?: HistoryTimeFrame) => {
      var d = new Date(timestamp);
      var date = [d.getFullYear(), d.getMonth(), d.getDate()];
      var time = [d.getHours(), d.getMinutes(), d.getSeconds()];
      if (frame === HistoryTimeFrame.HOUR) date = date.concat(time[0]);
      if (frame === HistoryTimeFrame.MONTH) date = date.slice(0, 2);
      if (frame === HistoryTimeFrame.YEAR) date = date.slice(0, 1);
      return date.join("-");
    }
    var clearAll = clearTimeFrame === HistoryTimeFrame.ALL;
    var latestItem = historyStore.items[0];
    var latestFrame = getTimeFrame(latestItem.date, clearTimeFrame);
    var clearFilter = (item: IHistoryItem) => latestFrame === getTimeFrame(item.date, clearTimeFrame);
    historyStore.clear(clearAll ? null : clearFilter);
  }

  renderHistory() {
    var { groupedItems, itemDetailsEnabled } = this;
    return (
      <ul className="history">
        {Object.keys(groupedItems).map(date => {
          return (
            <React.Fragment key={date}>
              <li className="history-date">{date}</li>
              {groupedItems[date].map(item => {
                var { id: itemId, vendor, from, to, text, translation, transcription } = item;
                var showDetails = itemDetailsEnabled.has(itemId);
                var translatedWith = __i18n("translated_with", [
                  vendor[0].toUpperCase() + vendor.substr(1),
                  [from, to].join(" → ").toUpperCase()
                ]).join("");
                var rtlClass = { rtl: isRTL(to) };
                return (
                  <li key={itemId}
                      title={translatedWith}
                      className={cssNames("history-item", { open: showDetails })}
                      onClick={() => this.toggleDetails(itemId)}>
                    <div className="main-info flex gaps">
                    <span className="text box grow flex gaps align-center">
                      {showDetails && (
                        <Icon
                          material="play_circle_outline"
                          onClick={prevDefault(() => ttsPlay({ vendor, text, lang: from }))}
                        />
                      )}
                      <span className="text">{text}</span>
                      {transcription ? <span className="transcription">({transcription})</span> : null}
                    </span>
                      <span className={cssNames("translation box grow", rtlClass)}>{translation}</span>
                      <Icon
                        className="remove-icon"
                        material="remove_circle_outline"
                        onClick={prevDefault(() => this.clearById(itemId))}
                      />
                    </div>
                    {showDetails ? this.renderDetails(item, rtlClass) : null}
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
    var count = await historyStore.importItems(historyItems);
    Notifications.ok(__i18n("history_import_success", count));
  }

  renderHeader() {
    var { clearTimeFrame, showSettings, showSearch, showImportExport, clearByTimeFrame } = this;
    var { historyEnabled, historyAvoidDuplicates, historySaveWordsOnly, historyPageSize } = settingsStore.data;
    return (
      <>
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
              onChange={this.onSearchChange}
              ref={elem => this.searchInput = elem}
            />
          )}
          {showSettings && (
            <div className="flex column gaps">
              <div className="flex gaps align-center">
                <Select className="box grow" value={clearTimeFrame} onChange={v => this.clearTimeFrame = v}>
                  <Option value={HistoryTimeFrame.HOUR} label={__i18n("history_clear_period_hour")}/>
                  <Option value={HistoryTimeFrame.DAY} label={__i18n("history_clear_period_day")}/>
                  <Option value={HistoryTimeFrame.MONTH} label={__i18n("history_clear_period_month")}/>
                  <Option value={HistoryTimeFrame.ALL} label={__i18n("history_clear_period_all")}/>
                </Select>
                <Button accent label={__i18n("history_button_clear")} onClick={clearByTimeFrame}/>
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
      </>
    )
  }

  render() {
    return (
      <div className="UserHistory">
        <FileInput
          id="import-history"
          accept="application/json"
          onImport={this.onImport}
        />
        {this.renderHeader()}
        {this.renderHistory()}
        {this.hasMore && (
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

viewsManager.registerPages("history", {
  Tab: props => <Tab {...props} label={__i18n("tab_history")} icon="history"/>,
  Page: UserHistory,
});
