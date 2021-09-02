import MD5 from "crypto-js/md5";
import { download } from "../../utils/downloadFile";
import { createStorageHelper } from "../../extension/storage";
import { getTranslator, isTranslation, ITranslationResult } from "../../vendors/translator";
import { settingsStorage, settingsStore } from "../settings/settings.storage";

export type IHistoryItemId = string;

export interface HistoryStorageModel {
  version?: number;
  translations: HistoryTranslations<IHistoryStorageItem>;

  /** @deprecated **/
  items?: IHistoryStorageItem[];
}

export interface HistoryTranslations<HistoryItem = IHistoryItem> {
  [id: IHistoryItemId]: HistoryTranslation<HistoryItem>;
}

export interface HistoryTranslation<HistoryItem = IHistoryItem> {
  [vendor: string]: HistoryItem;
}

export const historyStorage = createStorageHelper<HistoryStorageModel>("history", {
  area: "local",
  autoLoad: false, // turning off to avoid loading in content-pages (user-scripts)
  defaultValue: {
    translations: {},
  },
  migrations: [
    function (data: HistoryStorageModel) {
      if (!data.translations && data.items) {
        return {
          version: 1,
          ...toStorageModel(data.items),
        };
      }
    },
  ]
});

export function generateId(originalText: string, from: string, to: string): IHistoryItemId {
  return MD5([originalText, from, to].join(",")).toString();
}

export function toStorageModel(items: IHistoryStorageItem[]): HistoryStorageModel {
  const model: HistoryStorageModel = {
    translations: {},
  };

  items.forEach(storageItem => {
    const { text, from, to, vendor } = toHistoryItem(storageItem);
    const itemId = generateId(text, from, to);
    model.translations[itemId] ??= {};
    model.translations[itemId][vendor] = storageItem;
  });

  return model;
}

export async function loadHistory() {
  historyStorage.load();
  await historyStorage.whenReady;
  await settingsStorage.whenReady;
}

export async function importHistory(data: ITranslationResult | IHistoryItem | IHistoryStorageItem) {
  await loadHistory();

  if (isTranslation(data) && data.langFrom === "auto") {
    data.langFrom = data.langDetected; // always save detected language from "auto"
  }

  const storageItem = isStorageItem(data) ? data : toStorageItem(data);
  const item = toHistoryItem(storageItem);

  if (settingsStore.data.historySaveWordsOnly && !item.dictionary?.length) {
    return; // save dictionary words only
  }

  const itemId = generateId(item.text, item.from, item.to);
  const { translations } = historyStorage.get();
  translations[itemId] ??= {};
  translations[itemId][item.vendor] = storageItem;
}

export async function clearHistoryItem(id: IHistoryItemId, vendor?: string) {
  const { translations } = historyStorage.get();
  if (!translations[id]) return; // not found
  if (vendor) {
    delete translations[id][vendor];
  } else {
    delete translations[id]; // clear translations for all vendors
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
      id: generateId(text, from, to),
      date, vendor, from, to, text, translation, transcription,
      dictionary: dict.map(dict => ({
        wordType: dict[0],
        translation: dict[1]
      }))
    };
  } else {
    const { date, vendor, from, to, text, tr, ts, dict: dictionary = [] } = data;
    return {
      id: generateId(text, from, to),
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

export function isHistoryItem(data: any | IHistoryItem = {}): data is IHistoryItem {
  return !!(data.from && data.to);
}

export function isStorageItem(data: any | IHistoryStorageItemVersion2): data is IHistoryStorageItem {
  return Array.isArray(data) && typeof data[0] === "number" && data.length >= 5;
}

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

export function exportHistory(format: "json" | "csv", items: IHistoryItem[]) {
  var date = new Date().toISOString().replace(/:/g, "_");
  var filename = `xtranslate-history-${date}.${format}`;
  switch (format) {
    case "json":
      download.json(filename, items.map(toStorageItem));
      break;

    case "csv":
      var csvRows = [
        ["Date", "Translator", "Language", "Text", "Translation", "Transcription", "Dictionary"]
      ];
      items.forEach(item => {
        csvRows.push([
          new Date(item.date).toLocaleString(),
          getTranslator(item.vendor).title,
          item.from + "-" + item.to,
          item.text,
          item.translation,
          item.transcription || "",
          item.dictionary.map(({ wordType, translation }) => {
            return wordType + ": " + translation.join(", ")
          }).join("\n")
        ]);
      });
      download.csv(filename, csvRows);
      break;
  }
}
