import { storage } from "../../store/storage";
import { Translation } from "../../vendors/vendor";
import { IHistoryItem, IHistoryStorageItem, IHistoryStorageItemOld } from "./user-history.types";
import { ISettingsState } from "../settings/settings.types";
import isEqual = require("lodash/isEqual");

async function getHistoryRaw(): Promise<IHistoryStorageItem[]> {
  return storage.local.get("history").then(store => {
    return store.history || [];
  });
}

export async function getHistory(): Promise<IHistoryItem[]> {
  return getHistoryRaw().then(history => history.map(fromHistoryItem))
}

function toHistoryItem(translation: Translation) {
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
    ])
  ] as IHistoryStorageItem
}

function fromHistoryItem(item: IHistoryStorageItem | IHistoryStorageItemOld): IHistoryItem {
  var historyItem: IHistoryItem;
  if (Array.isArray(item)) {
    var [date, vendor, from, to, text, translation, transcription, dict] = item;
    historyItem = {
      id: null,
      date, vendor, from, to, text, translation, transcription,
      dictionary: dict.map(dict => ({
        wordType: dict[0],
        translation: dict[1]
      }))
    };
  }
  else {
    var { date, vendor, from, to, text, tr, ts, dict: dictionary } = item;
    historyItem = {
      id: null,
      date, vendor, from, to, text,
      translation: tr,
      transcription: ts,
      dictionary: dictionary.map(dict => ({
        wordType: dict.w,
        translation: dict.tr
      }))
    }
  }
  historyItem.id = btoa([date, vendor, from, to, Math.random()].join("-"));
  return historyItem;
}

export async function saveHistory(translation: Translation, settings: ISettingsState) {
  var { historySaveWordsOnly, historyAvoidDuplicates } = settings;
  if (historySaveWordsOnly && !translation.dictionary.length) {
    return;
  }
  return getHistoryRaw().then(history => {
    if (historyAvoidDuplicates) {
      var { vendor, langFrom, langTo, originalText } = translation;
      var comparableItem = [vendor, langFrom, langTo, originalText];
      history = history.filter(item => {
        var [time, vendor, fromLang, toLang, text] = item;
        return !isEqual([vendor, fromLang, toLang, text], comparableItem);
      })
    }
    history.unshift(toHistoryItem(translation));
    return storage.local.set({ history });
  });
}

export async function clearHistory(indexOrFilter?: number | ((item: IHistoryItem) => boolean)) {
  if (indexOrFilter == null) {
    return storage.local.set({ history: [] });
  }
  return getHistoryRaw().then(history => {
    if (typeof indexOrFilter === "number") {
      history.splice(indexOrFilter, 1);
    } else {
      history = history.filter(item => !indexOrFilter(fromHistoryItem(item)));
    }
    return storage.local.set({ history });
  });
}
