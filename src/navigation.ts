import { createObservableHistory } from "mobx-observable-history";
import { createTab, getManifest, getURL, isOptionsPage } from "./extension";

export type PageId = "settings" | "theme" | "translate" | "history";
export const defaultPageId: PageId = "settings";

export interface NavigationParams {
  page?: PageId;
}

export const navigation = createObservableHistory(); // not available in service-worker aka "background page"

export async function navigate(params: NavigationParams = {}) {
  const searchParams = `?${new URLSearchParams(Object.entries(params))}`;
  if (isOptionsPage()) {
    navigation.push(searchParams);
  } else {
    const optionsPage = getURL(getManifest().options_ui.page); // chrome://%extension-id/options.html
    return createTab(optionsPage + searchParams);
  }
}

export function getParam(name: keyof NavigationParams): string {
  return navigation.searchParams.get(name);
}

export function getParams(name: keyof NavigationParams): string[] {
  return navigation.searchParams.getAll(name);
}
