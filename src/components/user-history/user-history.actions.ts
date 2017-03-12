import { storage } from "../../store/storage";
import { Translation } from "../../vendors/vendor";
import { ITranslationHistory } from "./user-history.types";

async function getHistoryRaw(): Promise<any[]> {
  return storage.local.get("history").then(store => {
    return store.history || [];
  });
}

export async function getHistory() {
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
      dict.wordType, dict.meanings.map(mean => mean.word)
    ])
  ]
}

function fromHistoryItem(item): ITranslationHistory {
  if (Array.isArray(item)) {
    var [date, vendor, from, to, text, tr, ts, dict] = item;
    return {
      id: btoa([date, vendor, from, to, Math.random()].join("-")),
      date, vendor, from, to, text, tr, ts,
      dict: dict.map(d => ({ w: d[0], tr: d[1] }))
    }
  }
  return item;
}

export async function saveHistory(translation: Translation) {
  return getHistoryRaw().then(history => {
    history.unshift(toHistoryItem(translation));
    return storage.local.set({ history });
  });
}

export async function clearHistory(indexOrFilter?: number | ((item: ITranslationHistory) => boolean)) {
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
