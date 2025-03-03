// UI localization

import SupportedLocalesList from "../_locales/_locales.json"
import type { ReactNode } from "react";
import type { Pattern, PatternElement } from "@fluent/bundle/esm/ast"
import { FluentBundle, FluentResource, FluentVariable } from "@fluent/bundle"
import { observable } from "mobx";
import { getURL, proxyRequest, ProxyResponseType } from "./extension";
import { createLogger } from "./utils/createLogger";
import { createStorage } from "./storage";

const logger = createLogger({ systemPrefix: "[I18N-LOCALE]" });

export type Locale = keyof typeof SupportedLocalesList;
export const availableLocales = SupportedLocalesList;
export const fallbackLocale = "en";

export const bundles = observable.map<Locale, FluentBundle>();

export const i18nStorage = createStorage<{ lang: Locale }>("i18n", {
  area: "sync",
  defaultValue: {
    lang: getSystemLocale(),
  },
});

export async function i18nInit() {
  await loadMessages(fallbackLocale);
  await i18nStorage.load() // load current i18n settings

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
    const messages = await proxyRequest<string>({
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

export interface MessagePattern {
  message: Pattern
  bundle: FluentBundle
}

export function getMessagePattern(key: string): MessagePattern {
  const currentLocale = getLocale();
  const bundle = bundles.get(currentLocale);
  const message = bundle?.getMessage(key)?.value;

  if (message) {
    return { message, bundle }
  }

  const fallbackBundle = bundles.get(fallbackLocale);
  const fallbackMessage = fallbackBundle.getMessage(key)?.value; // fallback locale message (default: english)

  return {
    message: fallbackMessage,
    bundle: fallbackBundle,
  };
}

export function getMessage(key: string): string;
export function getMessage(key: string, placeholders: Record<string, ReactNode>): ReactNode;
export function getMessage(key: string, placeholders: Record<string, FluentVariable | any> = {}): ReactNode {
  const { message, bundle } = getMessagePattern(key);
  if (!message) return;

  const hasReactNodes = Object.values(placeholders ?? {}).some(item => typeof item === "object");
  if (hasReactNodes) {
    return Array.from(message).map((msgChunk: PatternElement) => {
      if (typeof msgChunk == "string") {
        return msgChunk;
      } else if (msgChunk.type === "var") {
        return placeholders[msgChunk.name];
      }
      return msgChunk;
    })
  }

  return bundle.formatPattern(message, placeholders);
}

export async function setLocale(lang: Locale) {
  await loadMessages(lang); // preload first for smooth UI switching
  i18nStorage.merge({ lang });
}

export function getLocale(): Locale {
  if (!i18nStorage.loaded) {
    return i18nStorage.defaultValue.lang;
  }
  return i18nStorage.get().lang;
}

export function getSystemLocale(): Locale {
  const systemLocale = (chrome.i18n.getUILanguage?.() ?? navigator.language) as Locale;
  if (availableLocales[systemLocale]) {
    return systemLocale;
  }

  const locale = systemLocale.split(/_-/)[0] as Locale; // handle "en-GB", etc.
  return availableLocales[locale] ? locale : fallbackLocale;
}
