import { action } from "mobx";
import { orderBy, uniqBy } from "lodash";
import { autobind } from "../../utils/autobind";
import { ITranslationResult } from "../../vendors/translator";
import { Store } from "../../store";
import { settingsStore } from "../settings/settings.store";

// todo: optimize store, array -> map/object with history_item_id

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

@autobind()
export class UserHistoryStore extends Store<IHistoryStorageItem[]> {
  constructor() {
    super({
      id: "history",
      storageType: "local",
      initialData: [],
      autoLoad: false,
    });
  }

  @action
  async importItems(items: IHistoryStorageItem[]): Promise<number> {
    if (!this.isLoaded) {
      await this.load();
    }
    var { historyAvoidDuplicates } = settingsStore.data;
    var storageItems: IHistoryStorageItem[] = [
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
    var data = orderBy(storageItems, item => {
      if (Array.isArray(item)) {
        if (typeof item[0] === "number") return item[0]; // v2
      }
      else {
        return item.date; // v1
      }
    }, "desc");
    var countBeforeCleanUp = this.data.length;
    if (historyAvoidDuplicates) {
      data = this.removeDuplicates(data);
    }
    this.update(data);
    return data.length - countBeforeCleanUp;
  }

  async saveTranslation(translation: ITranslationResult) {
    var { historySaveWordsOnly, historyAvoidDuplicates } = settingsStore.data;
    var { langFrom, langDetected } = translation;
    var noDictionary = !translation?.dictionary.length;
    if (!translation || this.isLoading || (historySaveWordsOnly && noDictionary)) {
      return;
    }
    if (!this.isLoaded) {
      await this.load();
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
    this.update(data);
  }

  protected removeDuplicates(items: IHistoryStorageItem[]) {
    return uniqBy(items, item => {
      var { vendor, from, to, text } = toHistoryItem(item);
      return vendor + from + to + text;
    })
  }

  searchItems(query = ""): IHistoryStorageItem[] {
    query = query.trim().toLowerCase();
    if (!query) return [];
    return this.data.filter(item => {
      var { text, translation } = toHistoryItem(item);
      return (
        text.toLowerCase().includes(query) ||
        translation.toLowerCase().includes(query)
      )
    });
  }

  clear(itemOrFilter?: IHistoryStorageItem | ((item: IHistoryItem) => boolean)) {
    if (!itemOrFilter) {
      this.reset();
    }
    else {
      if (typeof itemOrFilter === "function") {
        this.data = this.data.filter(item => !itemOrFilter(toHistoryItem(item)));
      }
      else {
        var index = this.data.findIndex(item => item === itemOrFilter);
        this.data.splice(index, 1);
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
