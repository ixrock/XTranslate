import { action, computed, } from "mobx";
import { orderBy, uniqBy } from "lodash";
import { autoBind } from "../../utils/autobind";
import { createStorage } from "../../storage-factory";
import { ITranslationResult } from "../../vendors/translator";
import { settingsStorage, settingsStore } from "../settings/settings.storage";

export interface UserHistoryModel {
  resourceVersion: number;
  items: IHistoryStorageItem[];
}

// TODO: simplify history storage model
export interface UserHistoryModelNew {
  translations: {
    [text: string]: IHistoryStorageItem[];
  }
}

export const historyStorage = createStorage<UserHistoryModel>("history", {
  resourceVersion: 1,
  items: [],
}, {
  area: "local",
  autoLoad: false,
  syncFromRemote: false,
  migrations: [
    function (data: UserHistoryModel | IHistoryStorageItem[]): UserHistoryModel {
      if (Array.isArray(data)) {
        return {
          items: data,
          resourceVersion: 1,
        };
      }
      return data;
    }
  ],
  onRemoteUpdate(update: UserHistoryModel) {
    const current = historyStorage.get();
    if (update.resourceVersion > current.resourceVersion) {
      historyStorage.set(update);
    }
  },
});

export class UserHistoryStore {
  private storage = historyStorage;

  constructor() {
    autoBind(this);
  }

  async preload() {
    this.storage.init();
    await this.storage.whenReady;
  }

  @computed get isReady(): boolean {
    return this.storage.loaded && settingsStorage.loaded;
  }

  @computed get rawItems(): IHistoryStorageItem[] {
    return Object.values(this.storage.get().items) ?? [];
  }

  @computed get items(): IHistoryItem[] {
    const historyItems = this.rawItems.map(toHistoryItem);
    return orderBy(historyItems, item => item.date, "desc"); // latest on top
  }

  @action
  async importItems(newItems: IHistoryStorageItem[], { replace = false } = {}): Promise<number> {
    await this.preload();
    const countBeforeUpdate = this.items.length;

    let items: IHistoryItem[] = [
      ...newItems.map(toHistoryItem),
      ...(replace ? [] : this.items),
    ];

    // remove duplicates of the same translations
    if (settingsStore.data.historyAvoidDuplicates) {
      items = uniqBy(items, item => {
        const { vendor, from, to, text } = item;
        return [vendor, from, to, text].join();
      });
    }

    this.storage.merge(draft => {
      draft.resourceVersion++;
      draft.items = items.map(toStorageItem);
    });

    return items.length - countBeforeUpdate;
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
      this.storage.reset(); // reset to default value
    } else {
      const filter = (item: IHistoryItem): boolean => {
        if (typeof idOrInvertedFilter === "function") return !idOrInvertedFilter(item);
        return item.id != idOrInvertedFilter;
      };
      const newItems = this.items.filter(filter).map(toStorageItem);
      this.importItems(newItems, { replace: true });
    }
  }
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
