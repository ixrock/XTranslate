import "./user-history.scss";

import React from "react";
import groupBy from "lodash/groupBy";
import orderBy from "lodash/orderBy";
import { action, computed, makeObservable, observable, reaction, runInAction } from "mobx";
import { observer } from "mobx-react";
import { bindGlobalHotkey, cssNames, disposer, fuzzyMatch, isHotkeyPressed, SimpleHotkey } from "@/utils";
import { ProviderCodeName } from "@/providers";
import { Checkbox } from "../checkbox";
import { Menu, MenuItem } from "../menu";
import { FileInput, ImportingFile, NumberInput, SearchInput } from "../input";
import { Option, Select } from "../select";
import { Button } from "../button";
import { settingsStore } from "../settings/settings.storage";
import { pageManager } from "../app/page-manager";
import { exportHistory, HistoryRecord, historyStorage, IHistoryItem, IHistoryItemId, IHistoryStorageItem, importHistory, ProviderHistoryRecord, toHistoryItem } from "./history.storage";
import { Icon } from "../icon";
import { Tab } from "../tabs";
import { Spinner } from "../spinner";
import { Notifications } from "../notifications";
import { getMessage } from "@/i18n";
import { isMac, materialIcons } from "@/config";
import { favoritesStorage } from "./favorites.storage";
import { UserHistoryItem } from "./user-history-item";

enum HistoryTimeFrame {
  HOUR = "hour",
  DAY = "day",
  MONTH = "month",
  YEAR = "year",
  ALL = "all",
}

@observer
export class UserHistory extends React.Component {
  private dispose = disposer();
  public searchInput?: SearchInput;
  public importHistoryInput?: FileInput<string>;

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  @observable page = 1;
  @observable searchText = "";
  @observable searchResults = observable.set<IHistoryItemId>();
  @observable detailsVisible = observable.set<IHistoryItemId>();
  @observable showSearch = false;
  @observable showSettings = false;
  @observable showOnlyFavorites = false;
  @observable showImportExport = false;
  @observable clearTimeFrame = HistoryTimeFrame.HOUR;
  @observable isLoaded = false;

  async componentDidMount() {
    await this.preloadStores();

    this.dispose.push(
      this.bindSearchResults(),
      this.bindGlobalHotkey(),
    );
  }

  @action
  private async preloadStores() {
    await Promise.all([
      historyStorage.load(),
      favoritesStorage.load(),
    ]);

    this.isLoaded = true;
  }

  private bindSearchResults() {
    return reaction(() => this.searchText, async (searchText) => {
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
    });
  };

  private bindGlobalHotkey() {
    const hotkey = SearchInput.defaultProps.globalHotkey as SimpleHotkey; // default hotkey from <SearchInput>

    return bindGlobalHotkey(hotkey, action(() => {
      this.showSearch = true;
      this.searchInput?.input?.focus();
    }));
  }

  componentWillUnmount() {
    this.dispose();
  }

  @computed get pageSize() {
    return this.page * settingsStore.data.historyPageSize;
  }

  @computed get items(): HistoryRecord<IHistoryItem> {
    const items: HistoryRecord<IHistoryItem> = {};
    const { translations } = historyStorage.toJS();
    const { favorites } = favoritesStorage.toJS();

    // convert history items to runtime format (instead of more compressed storage-type format)
    Object.entries(translations).forEach(([itemId, translationsByVendor]) => {
      items[itemId] = Object.fromEntries(
        Object.entries(translationsByVendor).map(([providerName, storageItem]: [ProviderCodeName, IHistoryStorageItem]) => {
          const isFavorite = favorites[itemId]?.[providerName];

          if (this.showOnlyFavorites && !isFavorite) {
            return;
          }

          return [providerName, toHistoryItem(storageItem)];
        }).filter(Boolean)
      );
    });

    return items;
  }

  @computed get itemsListSorted(): ProviderHistoryRecord<IHistoryItem>[] {
    let items: ProviderHistoryRecord<IHistoryItem>[] = Object.values(this.items)
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

  @computed get itemsGroupedByDay(): Map<number/*day*/, ProviderHistoryRecord<IHistoryItem>[]> {
    const items = this.itemsListSorted
      .slice(0, this.pageSize)
      // skip: might be empty after manual removing (to avoid invalid-date in lodash.groupBy)
      .filter(translations => Object.values(translations).length > 0);

    // group items per day
    const itemsPerDay = groupBy(items, translations => {
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

  private normalizeSearchValue(text: string) {
    return String(text).toLowerCase().trim();
  }

  async search(searchText: string): Promise<IHistoryItemId[]> {
    searchText = this.normalizeSearchValue(searchText);

    const searchResults = Object
      .entries(this.items)
      .filter(([itemId, translations]) => {
        return Object.values(translations).some(({ text, translation }: IHistoryItem) => {
          const searchFields = [text, translation].map(this.normalizeSearchValue);
          return searchFields.some(data => fuzzyMatch(data, searchText));
        });
      });

    return searchResults.map(([itemId]) => itemId);
  }

  private highlightSearch = (text: string): string => {
    if (!this.searchText) {
      return text;
    }

    const match = fuzzyMatch(text, this.searchText, {
      strict: false,
      wordReplacer(value) {
        return `<span class="searchMatchedResult">${value}</span>`;
      }
    });

    return match ? match.output : text;
  }

  exportHistory(format: "json" | "csv") {
    const itemsFlat = this.itemsListSorted.map(results => Object.values(results)).flat();

    exportHistory(format, itemsFlat);
  }

  toggleDetails(itemId: IHistoryItemId) {
    const { detailsVisible: map } = this;
    if (map.has(itemId)) {
      map.delete(itemId);
    } else {
      map.add(itemId);
    }
  }

  @action
  clearItemsByTimeFrame = () => {
    let items: { id: IHistoryItemId, date: number }[] = this.itemsListSorted
      .map((translation: ProviderHistoryRecord<IHistoryItem>) => ({
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
              {translations.map((translation: ProviderHistoryRecord<IHistoryItem>) => {
                const historyItems = Object.values(translation);
                if (!historyItems.length) {
                  return; // might be empty group after manual items remove
                }
                const groupId = historyItems[0]?.id; // ID is the same for the whole group
                const isOpened = this.detailsVisible.has(groupId);
                const toggleGroup = () => this.toggleDetails(groupId);

                return (
                  <div
                    key={groupId}
                    className={`history-items ${cssNames({ isOpened })}`}
                    tabIndex={0} // make focusable
                    onClick={toggleGroup}
                    onKeyDown={(evt) => isHotkeyPressed({ key: "Enter" }, evt) && toggleGroup()}
                  >
                    {historyItems.map(item => (
                      <UserHistoryItem
                        key={item.vendor}
                        item={item}
                        showDetails={this.detailsVisible.has(item.id)}
                        highlightSearch={this.highlightSearch}
                      />
                    ))}
                  </div>
                )
              })}
            </React.Fragment>
          )
        })}
      </div>
    );
  }

  onImport = async (files: ImportingFile<string>[]) => {
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

  @action
  onClearSearch = (evt: React.KeyboardEvent) => {
    if (this.searchText) return;
    this.toggleSearch();
  };

  @action
  toggleSearch = () => {
    this.showSearch = !this.showSearch;
  };

  renderHeader() {
    var { clearTimeFrame, showSettings, showSearch, showImportExport, showOnlyFavorites, clearItemsByTimeFrame } = this;
    var { historyEnabled, historySaveWordsOnly, historyPageSize } = settingsStore.data;
    return (
      <>
        <div className="settings flex gaps justify-center">
          <Checkbox
            label={getMessage("history_enabled_flag")}
            checked={historyEnabled}
            onChange={v => settingsStore.data.historyEnabled = v}
          />
          <div className="toolbar-icons">
            <Icon
              material="search"
              active={showSearch}
              tooltip={`${getMessage("history_icon_tooltip_search")} (${isMac() ? "Cmd" : "Ctrl"}+F)`}
              onClick={this.toggleSearch}
            />
            <Icon
              className="favorites"
              material={showOnlyFavorites ? materialIcons.favorite : materialIcons.unfavorite}
              active={showOnlyFavorites}
              tooltip={getMessage("history_show_favorites_only")}
              onClick={() => this.showOnlyFavorites = !showOnlyFavorites}
            />
            <Icon
              id="import_export_menu_icon_trigger"
              material="import_export"
              active={showImportExport}
              tooltip={!showImportExport ? getMessage("history_icon_tooltip_imp_exp") : undefined}
              onClick={action(() => this.showImportExport = !showImportExport)}
            />
            <Menu
              anchorId="import_export_menu_icon_trigger"
              onClose={action(() => this.showImportExport = false)}
            >
              <MenuItem onClick={() => this.importHistoryInput.selectFiles()}>
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
              active={showSettings}
              tooltip={!showSettings ? getMessage("history_icon_tooltip_settings") : undefined}
              onClick={() => this.showSettings = !showSettings}
            />
          </div>
        </div>
        <div className="settings-content flex column gaps">
          {showSearch && (
            <SearchInput
              autoFocus
              placeholder={getMessage("history_search_input_placeholder")}
              value={this.searchText}
              onChange={v => this.searchText = v}
              onClear={this.onClearSearch}
              ref={ref => {
                this.searchInput = ref;
              }}
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
      <div className="UserHistory flex column">
        <FileInput
          accept="application/json"
          outputType="text"
          onImport={this.onImport}
          ref={fileInput => {
            this.importHistoryInput = fileInput
          }}
        />
        {this.renderHeader()}
        {this.renderHistory()}
        {this.hasMore && (
          <div className="load-more flex justify-center">
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
