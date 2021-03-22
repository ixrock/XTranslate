import md5 from "crypto-js/md5";
import { action, computed } from "mobx";
import { orderBy, uniqBy } from "lodash";
import { autobind } from "../../utils/autobind";
import { createStorage } from "../../storages";
import { ITranslationResult } from "../../vendors/translator";
import { settingsStorage, settingsStore } from "../settings/settings.storage";

// FIXME: fast removing history items might lead to infinite updates loop for bgc <-> options-page
// FIXME: import-history file-dialog out of viewport in Brave when clicked from browser-action's window
// TODO: optimize storage and removing items by id

export type IHistoryItemId = string;

export interface IHistoryItem {
  id: IHistoryItemId;
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

@autobind()
export class UserHistoryStore {
  private storage = historyStorage;

  ready = Promise.allSettled([
    settingsStorage.whenReady,
    historyStorage.whenReady,
  ]);

  private get data(): IHistoryStorageItem[] {
    return this.storage.get();
  }

  @computed get items(): IHistoryItem[] {
    return this.data.map(toHistoryItem); // convert data to system format
  }

  @action
  async importItems(items: IHistoryStorageItem[]): Promise<number> {
    await this.storage.whenReady;

    var { historyAvoidDuplicates } = settingsStore.data;
    var storageItems: IHistoryStorageItem[] = [
      ...this.data,
      ...items.filter(item => {
        if (Array.isArray(item)) {
          return item.length >= 6 && typeof item[0] === "number"
        } else {
          var { date, vendor, from, to, text, } = item;
          return !!(date && vendor && from && to && text);
        }
      }),
    ]
    var data = orderBy(storageItems, item => {
      if (Array.isArray(item)) {
        if (typeof item[0] === "number") return item[0]; // v2
      } else {
        return item.date; // v1
      }
    }, "desc");
    var countBeforeCleanUp = this.data.length;
    if (historyAvoidDuplicates) {
      data = this.removeDuplicates(data);
    }
    this.storage.set(data);
    return data.length - countBeforeCleanUp;
  }

  @action
  async saveTranslation(translation: ITranslationResult) {
    await this.storage.whenReady;

    var { historySaveWordsOnly, historyAvoidDuplicates } = settingsStore.data;
    var { langFrom, langDetected } = translation;
    var noDictionary = !translation?.dictionary.length;
    if (!translation || (historySaveWordsOnly && noDictionary)) {
      return;
    }
    var data: IHistoryStorageItem[] = [
      toStorageItem({
        ...translation,
        langFrom: langFrom === "auto" ? langDetected : langFrom
      }),
      ...this.data,
    ];
    if (historyAvoidDuplicates) {
      data = this.removeDuplicates(data);
    }
    this.storage.set(data);
  }

  protected removeDuplicates(items: IHistoryStorageItem[]) {
    return uniqBy(items, item => {
      var { vendor, from, to, text } = toHistoryItem(item);
      return vendor + from + to + text;
    })
  }

  searchItems(query = ""): IHistoryItem[] {
    query = query.trim().toLowerCase();
    if (!query) return [];
    return this.items.filter(({ text, translation }) => {
      return (
        text.toLowerCase().includes(query) ||
        translation.toLowerCase().includes(query)
      )
    });
  }

  @action
  clear(matcher?: IHistoryItemId | ((item: IHistoryItem) => boolean)) {
    if (!matcher) {
      this.storage.clear(); // remove all
    } else {
      if (typeof matcher === "function") {
        const filteredData = this.data.filter(storageItem => !matcher(toHistoryItem(storageItem)));
        this.storage.set(filteredData);
      } else {
        // remove single history item
        var index = this.items.findIndex(item => item.id == matcher);
        if (index > -1) {
          const newData = this.data.filter((item, storageIndex) => storageIndex !== index);
          this.storage.set(newData);
        }
      }
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

export function getHistoryItemId(data: { date, vendor, from, to, text }): IHistoryItemId {
  return md5(Object.values(data).join("-")).toString(); // dynamic id
}

export function toHistoryItem(data: IHistoryStorageItem): IHistoryItem {
  if (Array.isArray(data)) {
    const [date, vendor, from, to, text, translation, transcription, dict] = data;
    return {
      id: getHistoryItemId({ text, to, from, vendor, date }),
      date, vendor, from, to, text, translation, transcription,
      dictionary: dict.map(dict => ({
        wordType: dict[0],
        translation: dict[1]
      }))
    };
  } else {
    const { date, vendor, from, to, text, tr, ts, dict: dictionary = [] } = data;
    return {
      id: getHistoryItemId(data),
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

export const historyStorage = createStorage<IHistoryStorageItem[]>("history", [], {
  observableOptions: {
    deep: false,
  }
});

export const historyStore = new UserHistoryStore();
