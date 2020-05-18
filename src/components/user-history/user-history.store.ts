import { action, IObservableArray, observable } from "mobx";
import { Store, StoreParams } from "../../store";
import { autobind } from "../../utils/autobind";
import { ITranslationResult } from "../../vendors/translator";
import { settingsStore } from "../settings/settings.store";
import orderBy from "lodash/orderBy";
import uniqBy from "lodash/uniqBy";

// fixme: history saving slowness with big data (>1-2MB)

export enum HistoryTimeFrame {
  HOUR,
  DAY,
  MONTH,
  YEAR,
  ALL,
}

export type IUserHistoryStoreData = IObservableArray<IHistoryStorageItem>;

const defaultHistory = observable.array<IHistoryStorageItem>([], { deep: false });

@autobind()
export class UserHistoryStore extends Store<IUserHistoryStoreData> {
  protected id = "history";

  constructor(params: Partial<StoreParams<IUserHistoryStoreData>> = {}) {
    super({
      autoSave: true,
      autoLoad: false,
      storageType: "local",
      initialData: defaultHistory,
      ...params,
    });
  }

  @action
  async importItems(items: IHistoryStorageItem[]): Promise<number> {
    if (!this.isLoaded) {
      await this.load();
    }
    var historyItems: IHistoryStorageItem[] = [
      ...this.data,
      ...items.filter(item => {
        if (Array.isArray(item)) {
          return item.length >= 6 && typeof item[0] === "number"
        }
        else {
          var { date, vendor, from, to, text, } = item;
          return !!(date && vendor && from && to && text);
        }
      }),
    ]
    var newItems = orderBy(historyItems, item => {
      if (Array.isArray(item)) {
        if (typeof item[0] === "number") return item[0]; // v2
      }
      else {
        return item.date; // v1
      }
    }, "desc");

    var countBeforeCleanUp = this.data.length;
    newItems = this.removeDuplicates(newItems);
    this.data.replace(newItems);
    return newItems.length - countBeforeCleanUp;
  }

  @action
  async saveTranslation(translation: ITranslationResult) {
    var { historySaveWordsOnly } = settingsStore.data;
    var noDictionary = !translation?.dictionary.length;
    if (!translation || this.isLoading || (historySaveWordsOnly && noDictionary)) {
      return;
    }
    if (!this.isLoaded) {
      await this.load();
    }
    var { langFrom, langDetected } = translation;
    if (langFrom === "auto") {
      translation.langFrom = langDetected;
    }
    var newItems: IHistoryStorageItem[] = [
      toStorageItem(translation),
      ...this.data,
    ];
    newItems = this.removeDuplicates(newItems);
    this.data.replace(newItems);
  }

  removeDuplicates(items: IHistoryStorageItem[]) {
    var { historyAvoidDuplicates } = settingsStore.data;
    if (historyAvoidDuplicates) {
      return uniqBy(items, item => {
        var { vendor, from, to, text } = toHistoryItem(item);
        return vendor + from + to + text;
      })
    }
    return items;
  }

  findItems(searchText = ""): IHistoryStorageItem[] {
    searchText = searchText.trim().toLowerCase();
    if (!searchText) return [];
    return this.data.filter(item => {
      var { text, translation } = toHistoryItem(item);
      return (
        text.toLowerCase().includes(searchText) ||
        translation.toLowerCase().includes(searchText)
      )
    });
  }

  clear(itemOrFilter?: IHistoryStorageItem | ((item: IHistoryItem) => boolean)) {
    if (!itemOrFilter) {
      this.data.replace([]); // remove all
    }
    else {
      if (typeof itemOrFilter === "function") {
        var newItems = this.data.filter(item => !itemOrFilter(toHistoryItem(item)));
        this.data.replace(newItems);
      }
      else {
        this.data.remove(itemOrFilter);
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
  }
  else {
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
    var [date, vendor, from, to, text, translation, transcription, dict] = data;
    return {
      date, vendor, from, to, text, translation, transcription,
      dictionary: dict.map(dict => ({
        wordType: dict[0],
        translation: dict[1]
      }))
    };
  }
  else {
    var { date, vendor, from, to, text, tr, ts, dict: dictionary = [] } = data;
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
