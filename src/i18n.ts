import React from "react";
import { observable } from "mobx";
import { createStorageHelper, getURL, isBackgroundPage, proxyRequest } from "./extension";
import { createLogger } from "./utils/createLogger";

export type Locale = keyof typeof locales;

// List of all provided locales from `_locales/*` folders
// Supported locales by browser: https://src.chromium.org/viewvc/chrome/trunk/src/third_party/cld/languages/internal/languages.cc
export const locales = {
  en: "English",
  de: "German",
  ru: "Russian",
  sr: "Serbian",
  tr: "Turkish",
  zh_TW: "Chinese (Taiwan)",
};

export interface Messages {
  [key: string]: {
    message: string;
  }
}

export const logger = createLogger({ systemPrefix: "[I18N-LOCALE]" });
export const messages = observable.map<Locale, Messages>({}, { deep: false });

export const i18nStorage = createStorageHelper("i18n", {
  area: "sync",
  defaultValue: {
    lang: getSystemLocale(),
  },
});

async function loadMessages(lang: Locale) {
  if (messages.has(lang) || !locales[lang]) {
    return; // skip, already loaded or doesn't exist
  }
  const localizationFile = getURL(`_locales/${lang}/messages.json`);
  try {
    const localizedMessages = isBackgroundPage()
      ? await fetch(localizationFile).then(res => res.json()) // required for background / service worker (e.g. context menus)
      : await proxyRequest<Messages>({ url: localizationFile })

    messages.set(lang, localizedMessages);
  } catch (error) {
    logger.error(`loading locale "${lang}" has failed (file: ${localizationFile})`, error);
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
  i18nStorage.merge({ lang });
}

export function getLocale(): Locale {
  return i18nStorage.get().lang;
}

export function getSystemLocale(): Locale {
  const locale = (chrome.i18n.getUILanguage?.() ?? navigator.language) as Locale;
  if (locales[locale]) {
    return locale;
  }

  const lang = locale.split(/_-/)[0] as Locale; // handle "en-GB", etc.
  return locales[lang] ? lang : "en";
}

export async function i18nInit() {
  await i18nStorage.load() // load current i18n settings
  await loadMessages("en") // always preload english as fallback locale

  const userLocale = getLocale();
  if (userLocale !== "en") {
    await loadMessages(getLocale());
  }
}
