import { storage } from "../../store/storage";
import { Translation } from "../../vendors/vendor";
import { ITranslationHistory } from "./user-history.types";

export async function getHistory(): Promise<ITranslationHistory[]> {
  return storage.local.get("history").then(store => {
    return store.history || [];
  });
}

function prepareHistoryItem(translation: Translation): ITranslationHistory {
  return {
    id: btoa(String(Date.now() * Math.random())),
    date: new Date().toISOString(),
    vendor: translation.vendor,
    from: translation.langFrom,
    to: translation.langTo,
    text: translation.originalText,
    tr: translation.translation,
    ts: translation.transcription,
    dict: translation.dictionary.map(dict => {
      return {
        w: dict.wordType,
        tr: dict.meanings.map(mean => mean.word)
      }
    })
  }
}

export async function saveHistory(translation: Translation) {
  return getHistory().then(history => {
    history.unshift(prepareHistoryItem(translation));
    return storage.local.set({ history });
  });
}

export async function clearHistory(indexOrFilter?: number | ((item: ITranslationHistory) => boolean)) {
  if (indexOrFilter == null) {
    return storage.local.set({ history: [] });
  }
  return getHistory().then(history => {
    if (typeof indexOrFilter === "number") {
      history.splice(indexOrFilter, 1);
    } else {
      history = history.filter(item => !indexOrFilter(item));
    }
    return storage.local.set({ history });
  });
}
