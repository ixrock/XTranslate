import { createObservableHistory } from "mobx-observable-history";
import { createTab, getManifest, getURL, isBackgroundPage } from "./extension";

export type PageId = "settings" | "theme" | "translate" | "history";
export const defaultPageId: PageId = "settings";

export interface NavigationParams {
  page?: PageId;
}

// not available in service-worker env (aka "background page")
export const navigation = !isBackgroundPage() && createObservableHistory();

export async function navigate(params: NavigationParams = {}) {
  const searchParams = `?${new URLSearchParams(Object.entries(params))}`;
  if (navigation) {
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
