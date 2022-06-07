import "./user-history.scss";

import React from "react";
import { groupBy, orderBy } from "lodash";
import { action, computed, makeObservable, observable, reaction, runInAction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { cssNames, prevDefault } from "../../utils";
import { getTranslator, getTranslators, isRTL } from "../../vendors";
import { Checkbox } from "../checkbox";
import { Menu, MenuItem } from "../menu";
import { FileInput, ImportingFile, Input, NumberInput } from "../input";
import { Option, Select } from "../select";
import { Button } from "../button";
import { settingsStore } from "../settings/settings.storage";
import { pageManager } from "../app/page-manager";
import { clearHistoryItem, exportHistory, historyStorage, HistoryTranslation, HistoryTranslations, IHistoryItem, IHistoryItemId, IHistoryStorageItem, importHistory, toHistoryItem } from "./history.storage";
import { Icon } from "../icon";
import { Tab } from "../tabs";
import { Spinner } from "../spinner";
import { Notifications } from "../notifications";
import { getMessage } from "../../i18n";

enum HistoryTimeFrame {
  HOUR = "hour",
  DAY = "day",
  MONTH = "month",
  YEAR = "year",
  ALL = "all",
}

@observer
export class UserHistory extends React.Component {
  constructor(props: object) {
    super(props);
    makeObservable(this);
    this.bindSearchResultsHandler();
  }

  @observable page = 1;
  @observable searchText = "";
  @observable searchResults = observable.set<IHistoryItemId>();
  @observable detailsVisible = observable.set<IHistoryItemId>();
  @observable showSearch = false;
  @observable showSettings = false;
  @observable showImportExport = false;
  @observable clearTimeFrame = HistoryTimeFrame.HOUR;
  @observable isLoaded = false;

  async componentDidMount() {
    await historyStorage.load();
    this.isLoaded = true;
  }

  @computed get pageSize() {
    return this.page * settingsStore.data.historyPageSize;
  }

  @computed get itemsListSorted(): HistoryTranslation[] {
    let items: HistoryTranslation[] = Object.values(this.items)
      // has at least one result from translation vendor
      .filter(translation => Object.values(translation).length > 0);

    // handle search-results for render() & exporting data flow
    if (this.searchText) {
      items = Array.from(this.searchResults).map(id => this.items[id]);
    }

    return orderBy(
      items,
      translation => Math.max(...Object.values(translation).map(item => item.date)),
      "desc", // latest on top
    )
  }

  @computed get items(): HistoryTranslations {
    const items: HistoryTranslations = {};
    const { translations } = historyStorage.toJS();

    // convert history items to runtime format (instead of more compressed storage-type format)
    Object.entries(translations).forEach(([itemId, translationsByVendor]) => {
      items[itemId] = Object.fromEntries(
        Object.entries(translationsByVendor)
          .map(([vendor, storageItem]) => [vendor, toHistoryItem(storageItem)])
      );
    });

    return items;
  }

  @computed get itemsGroupedByDay(): Map<number/*day*/, { [vendor: string]: IHistoryItem }[]> {
    var items = this.itemsListSorted
      .slice(0, this.pageSize)
      // skip: might be empty after manual removing (to avoid invalid-date in lodash.groupBy)
      .filter(translations => Object.values(translations).length > 0);

    // group items per day
    var itemsPerDay = groupBy(items, translations => {
      const creationTimes = Object.values(translations).map(item => item.date);
      if (!creationTimes.length) return;
      const latestTime = Math.max(...creationTimes);
      return new Date(new Date(latestTime).toDateString()).getTime(); // reset to beginning of the day
    });

    return new Map(
      Object.entries(itemsPerDay).map(([date, translations]) => [+date, translations])
    );
  }

  @computed get hasMore(): boolean {
    if (this.searchText && !this.searchResults.size) {
      return; // searching just started or results are empty, nothing to show more..
    }
    return this.itemsListSorted.length > this.pageSize;
  }

  bindSearchResultsHandler() {
    disposeOnUnmount(this, [
      reaction(() => this.searchText, async (searchText) => {
        if (!searchText) {
          this.searchResults.clear();
        } else {
          console.info(`[USER-HISTORY]: searching.. ${searchText}`)
          const searchResults: IHistoryItemId[] = await this.search(searchText);
          this.searchResults.replace(searchResults);
        }
      }, {
        name: "history-search",
        delay: 500,
      }),
    ]);
  }

  async search(searchText: string): Promise<IHistoryItemId[]> {
    searchText = searchText.toLowerCase().trim();

    const searchResults = Object
      .entries(this.items)
      .filter(([itemId, translations]) => {
        return Object.values(translations).some(({ text, translation }: IHistoryItem) => {
          return (
            text.toLowerCase().includes(searchText) || // original text
            translation.toLowerCase().includes(searchText) // result text
          );
        });
      });

    return searchResults.map(([itemId]) => itemId);
  }

  exportHistory(format: "json" | "csv") {
    const itemsFlat = this.itemsListSorted.map(results => Object.values(results)).flat();

    exportHistory(format, itemsFlat);
  }

  toggleDetails(itemId: IHistoryItemId) {
    var { detailsVisible: map } = this;
    if (map.has(itemId)) {
      map.delete(itemId);
    } else {
      map.add(itemId);
    }
  }

  @action
  clearItemsByTimeFrame = () => {
    let items: { id: IHistoryItemId, date: number }[] = this.itemsListSorted
      .map((translation: HistoryTranslation) => ({
        id: Object.values(translation)[0].id,
        date: Math.max(...Object.values(translation).map(item => item.date)),
      }));

    const latestEntryTime = new Date(Math.max(...items.map(({ date }) => date)));
    const { translations } = historyStorage.get();

    switch (this.clearTimeFrame) {
      case HistoryTimeFrame.ALL:
        return historyStorage.reset();

      case HistoryTimeFrame.HOUR:
        latestEntryTime.setHours(latestEntryTime.getHours(), 0, 0); // reset minutes and seconds
        break;

      case HistoryTimeFrame.DAY:
        latestEntryTime.setHours(0, 0, 0);
        break;

      case HistoryTimeFrame.MONTH:
        latestEntryTime.setHours(0, 0, 0);
        latestEntryTime.setDate(1); // set first day of the month
        break;

      case HistoryTimeFrame.YEAR:
        latestEntryTime.setHours(0, 0, 0);
        latestEntryTime.setMonth(0, 1);
        break;
    }

    items.forEach(item => {
      if (new Date(item.date).getTime() >= latestEntryTime.getTime()) {
        delete translations[item.id];
      }
    });
  }

  renderHistory() {
    if (!this.isLoaded) {
      return <Spinner center/>;
    }

    return (
      <div className="history">
        {Array.from(this.itemsGroupedByDay).map(([dayTime, translations]) => {
          return (
            <React.Fragment key={dayTime}>
              <div className="history-date">
                {new Date(dayTime).toDateString()}
              </div>
              {translations.map((translation: HistoryTranslation) => {
                const items = Object.values(translation);
                if (!items.length) return; // might be empty group after manual item remove
                const itemGroupId = items[0]?.id; // ID is the same for whole group
                const className = cssNames("history-items", {
                  isOpened: this.detailsVisible.has(itemGroupId),
                });
                return (
                  <div key={itemGroupId} className={className} onClick={() => this.toggleDetails(itemGroupId)}>
                    {getTranslators().map(vendor => {
                      const item = translation[vendor.name];
                      if (!item) return; // no results for this translation service yet
                      return <React.Fragment key={item.vendor}>{this.renderHistoryItem(item)}</React.Fragment>
                    })}
                  </div>
                )
              })}
            </React.Fragment>
          )
        })}
      </div>
    );
  }

  renderHistoryItem(item: IHistoryItem): React.ReactNode {
    var { id: itemId, vendor, from: langFrom, to: langTo, text, translation, transcription, dictionary } = item;
    var showDetails = this.detailsVisible.has(itemId);
    var translator = getTranslator(vendor);
    return (
      <div className={cssNames("history-item", { showDetails })}>
        {showDetails && (
          <small className="translation-service-info">
            <span className="translation-vendor">{translator.title} </span>
            <span className="translation-direction">{translator.getLangPairTitle(langFrom, langTo)}</span>
          </small>
        )}
        <div className="main-info flex gaps">
          <div className="text box grow flex gaps align-center">
            {showDetails && (
              <Icon
                material="play_circle_outline"
                onClick={prevDefault(() => translator.speak(langFrom, text))}
              />
            )}
            <span className="text">{text}</span>
            {transcription ? <span className="transcription">({transcription})</span> : null}
          </div>
          <div className={cssNames("translation box grow", { rtl: isRTL(langTo) })}>
            {translation}
          </div>
          <Icon
            material="remove_circle_outline"
            className="icons remove-icon"
            onClick={prevDefault(() => clearHistoryItem(itemId, vendor))}
          />
        </div>

        {showDetails && dictionary.length > 0 && (
          <div className="details flex gaps auto">
            {dictionary.map(dict => {
              var wordType = dict.wordType;
              return (
                <div key={wordType} className={cssNames("dictionary", { rtl: isRTL(item.to) })}>
                  <b className="word-type">{wordType}</b>
                  <div className="translations">
                    {dict.translation?.join?.(", ")}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    );
  }

  onImport = async (files: ImportingFile[]) => {
    var items: IHistoryStorageItem[] = [];
    files.forEach(({ file, data, error }) => {
      if (error) {
        return Notifications.error(getMessage("history_import_file_error", {
          fileName: file.name,
          errorInfo: error,
        }));
      }
      try {
        items.push(...JSON.parse(data));
      } catch (err) {
        console.error(`Parsing "${file.name}" has failed:`, err);
      }
    });
    runInAction(() => items.forEach(importHistory));
    Notifications.ok(getMessage("history_import_success", { itemsCount: items.length }));
  }

  renderHeader() {
    var { clearTimeFrame, showSettings, showSearch, showImportExport, clearItemsByTimeFrame } = this;
    var { historyEnabled, historySaveWordsOnly, historyPageSize } = settingsStore.data;
    return (
      <>
        <div className="settings flex gaps align-center justify-center">
          <Checkbox
            label={getMessage("history_enabled_flag")}
            checked={historyEnabled}
            onChange={v => settingsStore.data.historyEnabled = v}
          />
          <div className="actions">
            <Icon
              material="search"
              tooltip={!showSearch ? getMessage("history_icon_tooltip_search") : undefined}
              className={cssNames({ active: showSearch })}
              onClick={() => this.showSearch = !showSearch}
            />
            <Icon
              id="import_export_menu_icon_trigger"
              material="import_export"
              tooltip={!showImportExport ? getMessage("history_icon_tooltip_imp_exp") : undefined}
              className={cssNames({ active: showSearch })}
              onClick={action(() => this.showImportExport = !this.showImportExport)}
            />
            <Menu htmlFor="import_export_menu_icon_trigger">
              <MenuItem htmlFor="import-history">
                {getMessage("history_import_entries", { format: "JSON" })}
              </MenuItem>
              <MenuItem spacer/>
              <MenuItem onClick={() => this.exportHistory("json")}>
                {getMessage("history_export_entries", { format: "JSON" })}
              </MenuItem>
              <MenuItem onClick={() => this.exportHistory("csv")}>
                {getMessage("history_export_entries", { format: "CSV" })}
              </MenuItem>
            </Menu>
            <Icon
              material="settings"
              tooltip={!showSettings ? getMessage("history_icon_tooltip_settings") : undefined}
              className={cssNames({ active: showSettings })}
              onClick={() => this.showSettings = !showSettings}
            />
          </div>
        </div>
        <div className="settings-content flex column gaps">
          {showSearch && (
            <Input
              autoFocus
              placeholder={getMessage("history_search_input_placeholder")}
              value={this.searchText}
              onChange={v => this.searchText = v}
            />
          )}
          {showSettings && (
            <div className="flex column gaps">
              <div className="flex gaps align-center">
                <Select className="box grow" value={clearTimeFrame} onChange={v => this.clearTimeFrame = v}>
                  <Option value={HistoryTimeFrame.HOUR} label={getMessage("history_clear_period_hour")}/>
                  <Option value={HistoryTimeFrame.DAY} label={getMessage("history_clear_period_day")}/>
                  <Option value={HistoryTimeFrame.MONTH} label={getMessage("history_clear_period_month")}/>
                  <Option value={HistoryTimeFrame.YEAR} label={getMessage("history_clear_period_year")}/>
                  <Option value={HistoryTimeFrame.ALL} label={getMessage("history_clear_period_all")}/>
                </Select>
                <Button
                  accent label={getMessage("history_button_clear")}
                  onClick={clearItemsByTimeFrame}
                />
              </div>
              <div className="box flex gaps align-center">
                <Checkbox
                  className="dictionary-only box grow"
                  label={getMessage("history_settings_save_words_only")}
                  checked={historySaveWordsOnly}
                  onChange={v => settingsStore.data.historySaveWordsOnly = v}
                />
                <div className="page-size flex gaps align-center">
                  <span className="box grow">{getMessage("history_page_size")}</span>
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
              primary label={getMessage("history_button_show_more")}
              onClick={() => this.page++}
            />
          </div>
        )}
      </div>
    );
  }
}

pageManager.registerComponents("history", {
  Tab: props => <Tab {...props} label={getMessage("tab_history")} icon="history"/>,
  Page: UserHistory,
});
