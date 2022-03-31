import React from "react";
import { observable } from "mobx";
import { createStorageHelper, getURL, isBackgroundPage, proxyRequest } from "./extension";
import { createLogger } from "./utils";

export type Locale = "en" | "de" | "ru" | "sr" | "zh_TW";

export const supportedLocales: Record<Locale, string> = {
  en: "English",
  de: "German",
  ru: "Russian",
  sr: "Serbian",
  zh_TW: "Chinese (Taiwan)",
};

export interface Messages {
  [key: string]: {
    message: string;
  }
}

export const logger = createLogger({ systemPrefix: "[I18N-LOCALE]" });
export const messages = observable.map<Locale, Messages>({}, { deep: false });

const storage = createStorageHelper("i18n", {
  area: "sync",
  autoLoad: true,
  defaultValue: {
    lang: getSystemLocale(),
  },
});

async function loadMessages(lang: Locale) {
  if (messages.has(lang) || !supportedLocales[lang]) {
    return; // skip, already loaded or doesn't exist
  }
  const localizationFile = getURL(`_locales/${lang}/messages.json`);
  try {
    const data: Messages = isBackgroundPage()
      ? await fetch(localizationFile).then(res => res.json()) // required in context-menus
      : await proxyRequest({ url: localizationFile })

    messages.set(lang, data);
  } catch (error) {
    logger.error(`loading locale "${lang}" has failed (file: ${localizationFile})`);
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
  const locale = (chrome.i18n.getUILanguage?.() ?? navigator.language) as Locale;
  if (supportedLocales[locale]) {
    return locale;
  }

  const lang = locale.split(/_-/)[0] as Locale; // handle "en-GB", etc.
  return supportedLocales[lang] ? lang : "en";
}

export async function i18nInit() {
  await storage.whenReady;
  await loadMessages("en"); // preload english as fallback locale

  const userLocale = getLocale();
  if (userLocale !== "en") {
    await loadMessages(getLocale());
  }
}
