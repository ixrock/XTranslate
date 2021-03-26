import { action, comparer, observable, reaction } from "mobx";
import { uniqBy } from "lodash";
import { autobind } from "../../utils/autobind";
import { createStorage } from "../../storages";
import { ITranslationResult } from "../../vendors/translator";
import { settingsStore } from "../settings/settings.storage";

export interface UserHistoryModel {
  items: {
    [timestamp: number]: IHistoryStorageItem;
  }
}

export const historyStorage = createStorage<UserHistoryModel>("history", { items: [] }, {
  autoLoad: false, // load data manually by demand, e.g. history page, saving translation from website, etc.
  autoSync: false, // avoid auto-merge storage changes coming from chrome.runtime
});

@autobind()
export class UserHistoryStore {
  private storage = historyStorage;

  @observable isReady = false;
  @observable items = observable.map<IHistoryItemId, IHistoryItem>([], { deep: false });

  @action
  async init() {
    if (this.storage.initialized) return;
    try {
      this.storage.init({ migrate });
      await this.storage.whenReady;

      const items = Object.values(this.storage.get().items)
        .map(toHistoryItem)
        .map(item => [item.date, item]);

      this.items.replace(items);
      this.isReady = true;
      this.bindAutoSave();
    } catch (error) {
      console.error(`[HISTORY-STORAGE]: init ${error}`, this);
    }
  }

  private bindAutoSave() {
    return reaction(() => this.items.toJSON(), items => {
      const storageItems = Object.fromEntries(
        Object.entries(items).map(([id, item]) => [id, toStorageItem(item)])
      );
      this.storage.merge({
        items: storageItems,
      });
    }, {
      delay: 250,
      equals: comparer.shallow,
    });
  }

  @action
  async importItems(items: (IHistoryItem | IHistoryStorageItem)[]): Promise<number> {
    await this.init();
    const countBeforeUpdate = this.items.size;

    // add items
    items.forEach(item => {
      const historyItem = isHistoryItem(item) ? item : toHistoryItem(item);
      this.items.set(historyItem.date, historyItem);
    });

    // remove duplicates of the same translations
    if (settingsStore.data.historyAvoidDuplicates) {
      const entries: [IHistoryItemId, IHistoryItem][] = Array.from(this.items);
      const newEntries = uniqBy(entries, ([id, { vendor, from, to, text }]) => [vendor, from, to, text].join());
      if (entries.length !== newEntries.length) {
        this.items.replace(newEntries);
      }
    }

    // returns added items count
    return this.items.size - countBeforeUpdate;
  }

  @action
  async saveTranslation(translation: ITranslationResult) {
    await this.init();

    const skipWhen = [
      !translation, // no translation
      settingsStore.data.historySaveWordsOnly && !translation?.dictionary.length, // dictionary words only
    ].some(Boolean);
    if (skipWhen) {
      return false;
    }

    const { langFrom, langDetected } = translation;
    const storageItem = toStorageItem({
      ...translation,
      langFrom: langFrom === "auto" ? langDetected : langFrom
    });

    return this.importItems([storageItem]);
  }

  getLatestTimestamp(): number {
    const timestamps = Array.from(this.items.values()).map(item => item.date);
    return Math.max(...timestamps);
  }

  searchItems(query = ""): IHistoryItem[] {
    query = query.trim().toLowerCase();
    if (!query) return [];
    return Array.from(this.items.values()).filter(({ text, translation }) => {
      return (
        text.toLowerCase().includes(query) ||
        translation.toLowerCase().includes(query)
      )
    });
  }

  @action
  remove(itemIdOrCallback?: IHistoryItemId | ((item: IHistoryItem) => boolean)) {
    if (!itemIdOrCallback) {
      this.items.clear(); // delete all
    } else {
      if (typeof itemIdOrCallback === "function") {
        const items = Array.from(this.items.values()).filter(item => !itemIdOrCallback(item));
        this.items.replace(items.map(item => [item.date, item]));
      } else {
        this.items.delete(itemIdOrCallback);
      }
    }
  }
}

export function migrate(data: UserHistoryModel | IHistoryStorageItem[]): UserHistoryModel {
  // migrate to latest storage format with plain-object as root
  if (Array.isArray(data)) {
    return {
      items: Object.fromEntries(
        data.map((item: IHistoryStorageItem) => [item[0], item])
      )
    };
  }
  return data;
}

export function toStorageItem(data: ITranslationResult | IHistoryItem): IHistoryStorageItem {
  var { vendor, transcription, translation } = data;
  if (isHistoryItem(data)) {
    return [
      data.date,
      vendor,
      data.from,
      data.to,
      data.text,
      translation,
      transcription,
      data.dictionary.map(dict => [
        dict.wordType,
        dict.translation,
      ])
    ]
  } else {
    return [
      Date.now(),
      vendor,
      data.langFrom,
      data.langTo,
      data.originalText,
      translation,
      transcription,
      data.dictionary.map(dict => [
        dict.wordType,
        dict.meanings.map(mean => mean.word)
      ])
    ]
  }
}

export function toHistoryItem(data: IHistoryStorageItem): IHistoryItem {
  if (Array.isArray(data)) {
    const [date, vendor, from, to, text, translation, transcription, dict] = data;
    return {
      date, vendor, from, to, text, translation, transcription,
      dictionary: dict.map(dict => ({
        wordType: dict[0],
        translation: dict[1]
      }))
    };
  } else {
    const { date, vendor, from, to, text, tr, ts, dict: dictionary = [] } = data;
    return {
      date, vendor, from, to, text,
      translation: tr,
      transcription: ts,
      dictionary: dictionary.map(dict => ({
        wordType: dict.w,
        translation: dict.tr
      }))
    }
  }
}

export function isHistoryItem(item: any | IHistoryItem = {}): item is IHistoryItem {
  return !!(item.from && item.to);
}

export type IHistoryItemId = string | number /* timestamp */;

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

export const historyStore = new UserHistoryStore();
