// TODO: use new view-transition API when available:
//  https://developer.chrome.com/blog/view-transitions-in-2025

import { createObservableHistory } from "mobx-observable-history";
import { createTab, getManifest, getURL, isOptionsPage } from "./extension";
import type { ProviderCodeName } from "./providers";

export const navigation = createObservableHistory(); // not available in service-worker aka "background page"

export type PageId = "settings" | "popup" | "translate" | "history";
export const defaultPageId: PageId = "settings";

export interface NavigationParams {
  page: PageId;
}

export interface TranslationPageParams extends NavigationParams {
  page: "translate";
  provider: ProviderCodeName;
  from: string; // source language
  to: string; // target language
  text: string;
}

export async function navigate<Params extends NavigationParams>(params: Params | string) {
  const searchParams = typeof params === "string" ? params : `?${new URLSearchParams(Object.entries(params))}`;
  if (isOptionsPage()) {
    navigation.push(searchParams);
  } else {
    const optionsPage = getURL(getManifest().options_ui.page).split("?")[0]; // chrome://%extension-id/options.html
    return createTab(optionsPage + searchParams);
  }
}

export function getUrlParams<Params extends NavigationParams>(withDefaults = true): Params {
  const pageParams = Object.fromEntries(navigation.searchParams.entries()) as unknown as Params;

  if (withDefaults) {
    pageParams.page ??= defaultPageId;
  }

  return pageParams;
}

export function getTranslationPageUrl(params: Partial<TranslationPageParams>): string {
  return `?${new URLSearchParams({ ...params, page: "translate" })}`;
}
