// [I18n]: localization system with message-key type-safety (json-dictionaries)
// TODO: support pluralization via Intl.PluralRules(locale);

import React, { ReactNode } from "react";
import AvailableLocales from "../_locales/_locales.json";
import DefaultLocale from "../_locales/en/messages.json";
import { proxyRequest } from "@/background/httpProxy.bgc";
import { getURL, ProxyResponseType } from "@/extension";
import { createStorage } from "@/storage";

export type Locale = keyof typeof AvailableLocales;
export type LocalizationFile = typeof DefaultLocale;
export type LocalizationKey = keyof LocalizationFile;

export const availableLocales = AvailableLocales;
export const defaultLocale: Locale = "en";
export const messagesMap: DeepPartial<MessagesMap> = {};
export const placeholderRegex = /\{\s*(\$\w+)\s*}/g;
export const placeholderWithValueRegex = /\{\s*\$(\w+)\s*(?:=\s*([^}]+?)\s*)?}/g;

export const i18nStorage = createStorage<{ lang: Locale }>("i18n", {
  area: "sync",
  defaultValue: {
    lang: getSystemLocale(),
  },
});

export async function i18nInit() {
  await i18nStorage.load();
  await loadLocale(getLocale());
}

export async function setLocale(locale: Locale) {
  await loadLocale(locale);
  i18nStorage.merge({ lang: locale });
}

export function getLocale(): Locale {
  return i18nStorage.get().lang;
}

export function getSystemLocale(): Locale {
  const systemLocale = (chrome.i18n.getUILanguage?.() ?? navigator.language) as Locale;
  if (availableLocales[systemLocale]) {
    return systemLocale;
  }

  const locale = systemLocale.split(/_-/)[0] as Locale; // handle "en-GB", etc.
  return availableLocales[locale] ? locale : defaultLocale;
}

export type MessagesMap = Record<Locale, Record<LocalizationKey, {
  value: string,
  placeholders?: {
    [paramName: string]: string; // TODO: add type-safety
  }
}>>;

type MessageParams = Record<string, ReactNode | ((value: string) => ReactNode)>;
type HasNonStringParams<T extends MessageParams> = Exclude<T[keyof T], string> extends never ? false : true;

export function getMessage<K extends LocalizationKey, P extends MessageParams>(
  key: K,
  params: P & (HasNonStringParams<P> extends true ? unknown : never)
): ReactNode;

export function getMessage<K extends LocalizationKey, P extends MessageParams>(
  key: K,
  params?: MessageParams,
): string;

export function getMessage(
  key: LocalizationKey,
  params?: MessageParams,
): string | ReactNode {
  const locale = getLocale();
  const message = messagesMap[locale]?.[key] ?? messagesMap[defaultLocale]?.[key];
  const template = message?.value ?? "";
  const placeholders = message?.placeholders;
  const containsReactNode = params && Object.values(params).some((v) => typeof v !== 'string');
  const templateParts = template.split(placeholderRegex);

  if (placeholders) {
    Object.keys(placeholders).forEach(paramName => {
      if (!params?.[paramName]) {
        console.warn(`[I18N]: missing placeholder "${paramName}" in "${key}"`)
      }
    })
  }

  const result = templateParts.map((part, index) => {
    const paramName = part.startsWith("$") ? part.slice(1) : "";

    if (paramName) {
      const localizedParamValue = placeholders?.[paramName] as string;
      let paramValue = params?.[paramName];
      if (typeof paramValue === "function") {
        paramValue = paramValue(localizedParamValue);
      }
      if (React.isValidElement(paramValue)) {
        paramValue = React.cloneElement(paramValue, { key: index });
      }
      return paramValue ?? localizedParamValue;
    }

    return part;
  });

  return containsReactNode ? result : result.join('');
}

export async function loadLocale(locale: Locale) {
  if (locale !== defaultLocale) {
    await loadLocale(defaultLocale); // fallback-locale must be always available
  }

  const localeJsonFilePath = getURL(`_locales/${locale}/messages.json`);

  const localeJsonRaw: LocalizationFile = await proxyRequest({
    url: localeJsonFilePath,
    responseType: ProxyResponseType.JSON,
  });

  parseMessages(locale, localeJsonRaw);
}

function parseMessages(locale: Locale, rawData: LocalizationFile) {
  const messages = messagesMap[locale] ??= {};

  Object.entries(rawData).forEach(([key, { message: value }]) => {
    const message = messages[key as LocalizationKey] ??= {};
    message.value = value.replace(placeholderWithValueRegex, (v, paramName) => `{$${paramName}}`);

    Array.from(value.matchAll(placeholderWithValueRegex)).forEach(([, paramName, paramValue]) => {
      message.placeholders ??= {};
      message.placeholders[paramName] = paramValue;
    });
  });

  return messages;
}

export function formatNumber({ value, locale }: { value: number, locale: Locale }) {
  return new Intl.NumberFormat(locale).format(value);
}
