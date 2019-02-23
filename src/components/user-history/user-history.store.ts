import { observable, reaction, when } from "mobx";
import { Translation } from "../../vendors";
import { settingsStore } from "../settings/settings.store";
import isEqual = require("lodash/isEqual");

export enum HistoryTimeFrame {
  HOUR, DAY, MONTH, YEAR, ALL
}

export class UserHistoryStore {
  private id = "history";

  @observable loaded = false;
  @observable loading = false;
  @observable saving = false;
  @observable items = observable.array<IHistoryStorageItem>([], { deep: false });

  constructor() {
    // start auto-saving items after first loading
    when(() => this.loaded, () => {
      reaction(() => this.items.length, () => this.save(), {
        delay: 500
      });
    });
    // sync store when saved new translation (e.g. from content-page)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (this.saving) return;
      if (areaName === "sync" && changes[this.id]) {
        this.items.replace(changes[this.id].newValue || []);
      }
    });
  }

  load() {
    if (this.loaded) return;
    this.loading = true;
    chrome.storage.local.get(this.id, items => {
      this.items.replace(items[this.id] || []);
      this.loading = false;
      this.loaded = true;
    });
  }

  protected save() {
    this.saving = true;
    chrome.storage.local.set({ [this.id]: this.items.toJS() }, () => {
      this.saving = false;
    });
  }

  async saveTranslation(translation: Translation) {
    if (!translation) return;
    if (!this.loaded) {
      this.load();
      await when(() => this.loaded);
    }
    var { vendor, langFrom, langTo, langDetected, originalText } = translation;
    var { historySaveWordsOnly, historyAvoidDuplicates } = settingsStore.data;
    if (historySaveWordsOnly && !translation.dictionary.length) {
      return;
    }
    if (langFrom === "auto") {
      translation.langFrom = langFrom = langDetected;
    }
    var newItems: IHistoryStorageItem[] = [
      ...this.items
    ];
    if (historyAvoidDuplicates) {
      let newItemData = [vendor, langFrom, langTo, originalText];
      newItems = newItems.filter(item => {
        let { vendor, from, to, text } = this.toHistoryItem(item);
        return !isEqual(newItemData, [vendor, from, to, text]);
      });
    }
    newItems.unshift(this.toStorageItem(translation));
    this.items.replace(newItems);
  }

  protected toStorageItem(translation: Translation): IHistoryStorageItem {
    return [
      Date.now(),
      translation.vendor,
      translation.langFrom,
      translation.langTo,
      translation.originalText,
      translation.translation,
      translation.transcription,
      translation.dictionary.map(dict => [
        dict.wordType,
        dict.meanings.map(mean => mean.word)
      ] as [string, string[]])
    ]
  }

  toHistoryItem(storageItem: IHistoryStorageItem): IHistoryItem {
    var item: IHistoryItem;
    if (Array.isArray(storageItem)) {
      var [date, vendor, from, to, text, translation, transcription, dict] = storageItem;
      item = {
        date, vendor, from, to, text, translation, transcription,
        dictionary: dict.map(dict => ({
          wordType: dict[0],
          translation: dict[1]
        }))
      };
    }
    else {
      var { date, vendor, from, to, text, tr, ts, dict: dictionary } = storageItem;
      item = {
        date, vendor, from, to, text,
        translation: tr,
        transcription: ts,
        dictionary: dictionary.map(dict => ({
          wordType: dict.w,
          translation: dict.tr
        }))
      }
    }
    return item;
  }

  findItems(searchText = ""): IHistoryStorageItem[] {
    searchText = searchText.trim().toLowerCase();
    if (!searchText) return [];
    return this.items.filter(item => {
      var { text, translation } = this.toHistoryItem(item);
      return (
        text.toLowerCase().includes(searchText) ||
        translation.toLowerCase().includes(searchText)
      )
    });
  }

  clear(itemOrFilter?: IHistoryStorageItem | ((item: IHistoryItem) => boolean)) {
    if (!itemOrFilter) {
      this.items.replace([]); // remove all
    }
    else {
      if (typeof itemOrFilter === "function") {
        var newItems = this.items.filter(item => !itemOrFilter(this.toHistoryItem(item)));
        this.items.replace(newItems);
      }
      else {
        this.items.remove(itemOrFilter);
      }
    }
  }
}

export const userHistoryStore = new UserHistoryStore();

export interface IHistoryItem {
  date: number
  vendor: string
  from: string
  to: string
  text: string
  translation: string
  transcription?: string
  dictionary: {
    wordType: string
    translation: string[]
  }[]
}

// format used for keeping data in chrome.storage
export type IHistoryStorageItem = IHistoryStorageItemVersion1 | IHistoryStorageItemVersion2;

export interface IHistoryStorageItemVersion1 {
  date: number
  vendor: string
  from: string
  to: string
  text: string
  tr: string
  ts?: string
  dict: {
    w: string
    tr: string[]
  }[]
}

export type IHistoryStorageItemVersion2 = [
  number, // 0 - time
  string, // 1 - vendor
  string, // 2 - lang from
  string, // 3 - lang to
  string, // 4 - original text
  string, // 5 - translation result
  string, // 6 - transcription
  [
    // 7 - dictionary
    string, /*word type*/
    string[] /*translations*/
    ][]
  ];
