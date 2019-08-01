import { observable } from "mobx";
import { Store, StoreParams } from "../../store";
import { autobind } from "../../utils/autobind";
import { ITranslationResult } from "../../vendors/translator";
import { settingsStore } from "../settings/settings.store";
import isEqual from "lodash/isEqual";

export enum HistoryTimeFrame {
  HOUR, DAY, MONTH, YEAR, ALL
}

export type IUserHistoryStoreData = typeof defaultHistory;

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
      ...params
    });
  }

  static toStorageItem(translation: ITranslationResult): IHistoryStorageItem {
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

  static toHistoryItem(storageItem: IHistoryStorageItem): IHistoryItem {
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

  async saveTranslation(translation: ITranslationResult) {
    if (!translation) return;
    if (!this.isLoaded) await this.load();

    var { vendor, langFrom, langTo, langDetected, originalText } = translation;
    var { historySaveWordsOnly, historyAvoidDuplicates } = settingsStore.data;
    if (historySaveWordsOnly && !translation.dictionary.length) {
      return;
    }
    if (langFrom === "auto") {
      translation.langFrom = langFrom = langDetected;
    }
    var newItems: IHistoryStorageItem[] = [
      ...this.data
    ];
    if (historyAvoidDuplicates) {
      let newItemData = [vendor, langFrom, langTo, originalText];
      newItems = newItems.filter(item => {
        let { vendor, from, to, text } = UserHistoryStore.toHistoryItem(item);
        return !isEqual(newItemData, [vendor, from, to, text]);
      });
    }
    newItems.unshift(UserHistoryStore.toStorageItem(translation));
    this.data.replace(newItems);
  }

  findItems(searchText = ""): IHistoryStorageItem[] {
    searchText = searchText.trim().toLowerCase();
    if (!searchText) return [];
    return this.data.filter(item => {
      var { text, translation } = UserHistoryStore.toHistoryItem(item);
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
        var newItems = this.data.filter(item => !itemOrFilter(UserHistoryStore.toHistoryItem(item)));
        this.data.replace(newItems);
      }
      else {
        this.data.remove(itemOrFilter);
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
