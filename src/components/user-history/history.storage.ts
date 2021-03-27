import { action, computed, } from "mobx";
import { orderBy, uniqBy } from "lodash";
import { autobind } from "../../utils/autobind";
import { createStorage } from "../../storages";
import { ITranslationResult } from "../../vendors/translator";
import { settingsStorage, settingsStore } from "../settings/settings.storage";

export interface UserHistoryModel {
  items: IHistoryStorageItem[];
}

@autobind()
export class UserHistoryStore {
  private storage = createStorage<UserHistoryModel>("history", { items: [] }, {
    autoLoad: false, // loading data handled manually on demand
    sync: false, // skip auto-merging changes from chrome.storage / avoid possible race conditions (e.g: fast removing items from UI)
  });

  async preload() {
    this.storage.init({ migrate });
    await this.storage.whenReady;
  }

  @computed get isReady(): boolean {
    return [
      this.storage.loaded,
      settingsStorage.loaded,
    ].every(Boolean);
  }

  @computed get rawItems(): IHistoryStorageItem[] {
    return Object.values(this.storage.get()?.items) ?? [];
  }

  @computed get items(): IHistoryItem[] {
    const historyItems = this.rawItems.map(toHistoryItem);
    return orderBy(historyItems, item => item.date, "desc"); // latest on top
  }

  @action
  async importItems(items: IHistoryStorageItem[], { replace = false } = {}): Promise<number> {
    await this.preload();
    const countBeforeUpdate = this.items.length;

    let allItems: IHistoryItem[] = [
      ...items.map(toHistoryItem),
      ...(replace ? [] : this.items),
    ];

    // remove duplicates of the same translations
    if (settingsStore.data.historyAvoidDuplicates) {
      allItems = uniqBy(allItems, item => {
        const { vendor, from, to, text } = item;
        return [vendor, from, to, text].join();
      });
    }

    // update items
    this.storage.merge({
      items: allItems.map(toStorageItem)
    });

    return allItems.length - countBeforeUpdate;
  }

  @action
  saveTranslation(translation: ITranslationResult) {
    const skip = [
      !translation, // no translation
      settingsStore.data.historySaveWordsOnly && !translation?.dictionary.length, // dictionary words only
    ].some(Boolean);

    if (skip) {
      return;
    }

    const { langFrom, langDetected } = translation;
    return this.importItems([
      toStorageItem({
        ...translation,
        langFrom: langFrom === "auto" ? langDetected : langFrom,
      })
    ]);
  }

  getLatestTimestamp(): number {
    return Math.max(...this.items.map(item => item.date));
  }

  searchItems(query = ""): IHistoryItem[] {
    query = query.trim().toLowerCase();
    if (!query) return [];
    return Object.values(this.items).filter(({ text, translation }) => {
      return (
        text.toLowerCase().includes(query) ||
        translation.toLowerCase().includes(query)
      )
    });
  }

  @action
  remove(idOrInvertedFilter?: IHistoryItemId | ((item: IHistoryItem) => boolean)) {
    if (!idOrInvertedFilter) {
      this.storage.clear(); // delete all
    } else {
      const filter = (item: IHistoryItem): boolean => {
        if (typeof idOrInvertedFilter === "function") return !idOrInvertedFilter(item);
        return item.id != idOrInvertedFilter;
      };
      this.storage.merge({
        items: this.items.filter(filter).map(toStorageItem),
      });
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
      id: date,
      date, vendor, from, to, text, translation, transcription,
      dictionary: dict.map(dict => ({
        wordType: dict[0],
        translation: dict[1]
      }))
    };
  } else {
    const { date, vendor, from, to, text, tr, ts, dict: dictionary = [] } = data;
    return {
      id: date,
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

export type IHistoryItemId = string | number; // timestamp

export interface IHistoryItem {
  id?: IHistoryItemId;
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
