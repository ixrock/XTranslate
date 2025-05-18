import { runInAction } from "mobx";
import { md5 } from "js-md5";
import { download } from "../../utils/downloadFile";
import { createStorage } from "../../storage";
import { getTranslator, ITranslationResult } from "../../providers/translator";
import type { ProviderCodeName } from "../../providers";

export type IHistoryItemId = string;

export type ProviderHistoryRecord<Data = IHistoryItem | IHistoryStorageItem | boolean> =
  Partial<Record<ProviderCodeName, Data>>;

export interface HistoryRecord<Data> {
  [id: IHistoryItemId]: ProviderHistoryRecord<Data>;
}

export interface HistoryStorageModel {
  translations: HistoryRecord<IHistoryStorageItem>;
}

export const historyStorage = createStorage<HistoryStorageModel>("history", {
  area: "local",
  autoLoad: false, // manual loading before saving data or listing items
  deepMergeOnLoad: false,
  defaultValue: {
    translations: {},
  },
});

export function getHistoryItemId(item: ITranslationResult | IHistoryItem): string {
  if (isHistoryItem(item)) {
    return generateId(item.text, item.from, item.to);
  } else {
    return generateId(item.originalText, item.langDetected, item.langTo);
  }
}

export function generateId(originalText: string, from: string, to: string): IHistoryItemId {
  return md5([originalText, from, to].join(",")).toString();
}

export function importHistory(data: IHistoryItem | IHistoryStorageItem) {
  const storageItem = isStorageItem(data) ? data : toStorageItem(data);

  const item = isHistoryItem(data) ? data : toHistoryItem(storageItem);
  const { translations } = historyStorage.get();
  const itemId = generateId(item.text, item.from, item.to);

  runInAction(() => {
    translations[itemId] ??= {};
    translations[itemId][item.vendor] = storageItem;
  });
}

export function clearHistoryItem(id: IHistoryItemId, provider?: ProviderCodeName) {
  const { translations } = historyStorage.get();
  if (!translations[id]) return; // not found
  if (provider) {
    delete translations[id][provider];
  } else {
    delete translations[id]; // clear translations for all translation providers
  }
}

export function toTranslationResult(data: IHistoryStorageItem): ITranslationResult {
  const {
    translation, transcription, dictionary, vendor,
    text: originalText,
    from: langFrom,
    to: langTo,
  } = toHistoryItem(data);

  return {
    vendor,
    originalText,
    translation,
    transcription,
    langFrom,
    langTo,
    dictionary: dictionary.map(({ translation, wordType, similarReverseWords }) => ({
      wordType,
      meanings: translation.map((wordMeaning, index) => {
        console.info(`[${wordType}]: ${wordMeaning} -- ${similarReverseWords?.[index]}`)
        return {
          word: wordMeaning,
          translation: similarReverseWords?.[index] || [],
        };
      }),
    })),
  }
}

export function toStorageItem(data: ITranslationResult | IHistoryItem): IHistoryStorageItemVersion2 {
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
        dict.similarReverseWords ?? [],
      ]),
    ]
  } else {
    return [
      Date.now(), // new history-item, saving with just made translation's time
      vendor,
      data.langDetected || data.langFrom,
      data.langTo,
      data.originalText,
      translation,
      transcription,
      data.dictionary.map(dict => [
        dict.wordType,
        dict.meanings.map(mean => mean.word),
        dict.meanings.map(mean => mean.translation),
      ]),
    ]
  }
}

export function toHistoryItem(data: IHistoryStorageItem): IHistoryItem {
  if (!data) return;

  if (Array.isArray(data)) {
    const [date, vendor, from, to, text, translation, transcription, dict] = data;
    return {
      id: generateId(text, from, to),
      date, from, to, text, translation, transcription,
      vendor: vendor as ProviderCodeName,
      dictionary: dict.map(dict => ({
        wordType: dict[0],
        translation: dict[1],
        similarReverseWords: dict[2] ?? [],
      })),
    };
  } else {
    // old format v1, deprecated
    const { date, vendor, from, to, text, tr, ts, dict: dictionary = [] } = data;
    return {
      id: generateId(text, from, to),
      date, from, to, text,
      vendor: vendor as ProviderCodeName,
      translation: tr,
      transcription: ts,
      dictionary: dictionary.map(dict => ({
        wordType: dict.w,
        translation: dict.tr,
        similarReverseWords: [] as string[][],
      })),
    };
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
  vendor: ProviderCodeName;
  date: number
  from: string
  to: string
  text: string
  translation: string
  transcription?: string
  dictionary: {
    wordType: string
    translation: string[]
    similarReverseWords: string[][]
  }[];
}

// format used for keeping data in chrome.storage
export type IHistoryStorageItem = IHistoryStorageItemVersion1 | IHistoryStorageItemVersion2;

/* @deprecated */
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
  string, // 1 - translation provider aka "vendor"
  string, // 2 - lang from
  string, // 3 - lang to
  string, // 4 - original text
  string, // 5 - translation result
  string, // 6 - transcription
  [
    // 7 - dictionary
    string, /*word type*/
    string[], /*translations*/
    string[][], /* similar word groups (reverse translated) per translation */
  ][],
];

export function exportHistory(format: "json" | "csv", items: IHistoryItem[]) {
  var date = new Date().toISOString().replace(/:/g, "_");
  var filename = `xtranslate-history-${date}.${format}`;
  switch (format) {
  case "json":
    download.json(filename, items.map(item => toStorageItem(item)));
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
