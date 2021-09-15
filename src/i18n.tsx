import React from "react";
import { observable } from "mobx";
import { createStorageHelper } from "./extension/storage";
import { getURL } from "./extension";
import { createLogger } from "./utils";

export type Locale = keyof typeof locales;

export interface Messages {
  [key: string]: {
    message: string;
  }
}

export const logger = createLogger({ systemPrefix: "[I18n]" });
export const messages = observable.map<string /*locale*/, Messages>({}, { deep: false });

export const locales = {
  en: "English",
  de: "German",
  ru: "Russian",
  sr: "Serbian",
  zh_TW: "Chinese (Taiwan)",
};

const storage = createStorageHelper("i18n", {
  area: "sync",
  autoLoad: true,
  defaultValue: {
    lang: getSystemLocale(),
  },
});

async function loadMessages(lang: Locale) {
  if (messages.has(lang) || !locales[lang]) {
    return; // skip, already loaded or doesn't exist
  }
  try {
    const localizationFile = getURL(`_locales/${lang}/messages.json`);
    const data: Messages = await fetch(localizationFile).then(res => res.json());
    messages.set(lang, data);
  } catch (error) {
    logger.error(`loading locale "${lang}" has failed`, error);
  }
}

export function getMessage(key: string): string;
export function getMessage(key: string, placeholders: Record<string, React.ReactNode>): React.ReactNode;
export function getMessage(key: string, placeholders?: Record<string, React.ReactNode>): React.ReactNode {
  const message =
    messages.get(getLocale())?.[key]?.message ||
    messages.get("en")?.[key]?.message; // fallback locale is "EN"

  if (!message) {
    return `[${key}]`; // not found
  }

  // add substitutions for placeholders, e.g. {"message": "search results for '%text%'"}
  if (placeholders) {
    const chunks = message.split(/%(.*?)%/).map(chunk => placeholders[chunk] ?? chunk);
    if (chunks.some(React.isValidElement)) {
      return React.Children.toArray(chunks);
    } else {
      return chunks.join("");
    }
  }

  return message;
}

export async function setLocale(lang: Locale) {
  await loadMessages(lang); // preload first for smooth UI switching
  storage.merge({ lang });
}

export function getLocale(): Locale {
  return storage.get().lang;
}

export function getSystemLocale(): Locale {
  const locale = navigator.language;
  if (locales[locale]) return locale as Locale;

  const [lang] = locale.split(/_-/); // handle "en-GB", etc.
  return locale[lang] || "en";
}

export async function detectLanguage(text: string): Promise<chrome.i18n.LanguageDetectionResult> {
  return new Promise(resolve => chrome.i18n.detectLanguage(text, resolve));
}

export async function i18nInit() {
  await storage.whenReady;
  await loadMessages("en"); // always preload english as fallback locale
  await loadMessages(getLocale()); // load current locale
}
