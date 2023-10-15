// Localization

import React from "react";
import { observable } from "mobx";
import { createStorageHelper, getURL, isBackgroundWorker, proxyRequest, ProxyResponseType } from "./extension";
import { createLogger } from "./utils/createLogger";
import { FluentBundle, FluentResource, FluentVariable } from "@fluent/bundle"
import type { Pattern, PatternElement } from "@fluent/bundle/esm/ast"

export const logger = createLogger({ systemPrefix: "[I18N-LOCALE]" });

// List of all provided locales from `_locales/*` folders
// Supported locales by browser: https://src.chromium.org/viewvc/chrome/trunk/src/third_party/cld/languages/internal/languages.cc
export type Locale = keyof typeof availableLocales;

export const fallbackLocale = "en";

export const availableLocales = {
  en: "English",
  de: "German",
  ru: "Russian",
  sr: "Serbian",
  tr: "Turkish",
  vi: "Vietnamese",
  zh_TW: "Chinese (Taiwan)",
};

export const bundles = observable.map<Locale, FluentBundle>();

export const storage = createStorageHelper<{ lang: Locale }>("i18n", {
  area: "sync",
  defaultValue: {
    lang: getSystemLocale(),
  },
});

export async function i18nInit() {
  await loadMessages(fallbackLocale);
  await storage.load() // load current i18n settings

  const userLocale = getLocale();
  if (userLocale !== fallbackLocale) {
    await loadMessages(getLocale());
  }
}

async function loadMessages(locale: Locale) {
  const preloaded = bundles.has(locale);
  const unknownLocale = !availableLocales[locale];
  if (preloaded || unknownLocale) return;

  const messagesUrl = getURL(`_locales/${locale}.ftl`);
  try {
    const messages = isBackgroundWorker()
      ? await fetch(messagesUrl).then(res => res.text()) // required in background / service worker (e.g. context menus)
      : await proxyRequest<string>({ // requested from options and content pages
        url: messagesUrl,
        responseType: ProxyResponseType.TEXT,
      });

    const bundle = new FluentBundle(locale);
    bundle.addResource(new FluentResource(messages))
    bundles.set(locale, bundle);

    logger.info(`locale "${locale}" successfully loaded`, {
      domain: location.href,
      bundle,
      messages,
    });
  } catch (error) {
    logger.error(`loading locale "${locale}" has failed (file: ${messagesUrl})`, {
      domain: location.href,
      error,
    });
  }
}

export function getMessagePattern(key: string): { message: Pattern, bundle: FluentBundle } {
  const currentLocale = getLocale();
  const bundle = bundles.get(currentLocale);
  const fallbackBundle = bundles.get(fallbackLocale);
  const message = bundle?.getMessage(key)?.value;
  const fallbackMessage = fallbackBundle.getMessage(key).value;

  if (message) {
    return { message, bundle }
  }

  return {
    message: fallbackMessage,
    bundle: fallbackBundle,
  };
}

export function getMessage(key: string): string;
export function getMessage(key: string, placeholders: Record<string, React.ReactNode>): React.ReactNode;
export function getMessage(key: string, placeholders: Record<string, FluentVariable | any> = {}): React.ReactNode {
  const { message, bundle } = getMessagePattern(key);
  if (!message) {
    return `[${key}:not-found]`;
  }

  const formatAsReactNode = Object.values(placeholders ?? {}).some(React.isValidElement);
  if (formatAsReactNode) {
    return React.Children.toArray(
      Array.from(message).map((msgChunk: PatternElement) => {
        if (typeof msgChunk == "string") {
          return msgChunk;
        } else if (msgChunk.type === "var") {
          return placeholders[msgChunk.name];
        }
        return msgChunk;
      })
    )
  }

  return bundle.formatPattern(message, placeholders);
}

export async function setLocale(lang: Locale) {
  await loadMessages(lang); // preload first for smooth UI switching
  storage.merge({ lang });
}

export function getLocale(): Locale {
  if (!storage.loaded) {
    return storage.defaultValue.lang;
  }
  return storage.get().lang;
}

export function getSystemLocale(): Locale {
  const systemLocale = (chrome.i18n.getUILanguage?.() ?? navigator.language) as Locale;
  if (availableLocales[systemLocale]) {
    return systemLocale;
  }

  const locale = systemLocale.split(/_-/)[0] as Locale; // handle "en-GB", etc.
  return availableLocales[locale] ? locale : fallbackLocale;
}
