import { storage } from "../../store/storage";
import { Translation } from "../../vendors/vendor";
import { IHistoryItem, IHistoryStorageItem, IHistoryStorageItemOld } from "./user-history.types";
import { ISettingsState } from "../settings/settings.types";

import MD5 = require("crypto-js/md5");
import isEqual = require("lodash/isEqual");

async function getHistoryRaw(): Promise<IHistoryStorageItem[]> {
  return storage.local.get("history").then(store => store.history || []);
}

export async function getHistory(search = ""): Promise<IHistoryItem[]> {
  return getHistoryRaw()
    .then(history => history.map(fromHistoryItem))
    .then(history => {
      search = search.trim().toLowerCase();
      if (search) {
        return history.filter(({ text, translation }) => {
          return text.toLowerCase().includes(search) ||
            translation.toLowerCase().includes(search)
        })
      }
      return history;
    });
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
  historyItem.id = MD5(JSON.stringify(item)).toString();
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

export async function clearHistory(idOrFilterFn?: string | ((item: IHistoryItem) => boolean)) {
  if (idOrFilterFn == null) {
    return storage.local.set({ history: [] });
  }
  return getHistoryRaw().then(history => {
    history = history.filter(item => {
      var historyItem = fromHistoryItem(item);
      if (typeof idOrFilterFn === "function") return !idOrFilterFn(historyItem)
      return historyItem.id !== idOrFilterFn;
    });
    return storage.local.set({ history });
  });
}
