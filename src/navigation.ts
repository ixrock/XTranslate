import { createObservableHistory } from "mobx-observable-history";
import { createTab, getManifest, getURL } from "./extension";
import { PageId } from "./components/app/views-manager";

export interface NavigationSearchParams {
  [pageId: string]: string;
  page?: PageId;
}

export const navigation = createObservableHistory();
export const defaultPageId: PageId = "settings";

export function navigate(params: NavigationSearchParams = {}) {
  const absPageUrl = getURL(getManifest().options_page); // starts with chrome://%extension-id/options.html
  const isLocalRoute = document.location.href.startsWith(absPageUrl);
  const searchParams = `?${navigation.searchParams.normalize(params)}`;

  if (isLocalRoute) {
    navigation.push(searchParams);
  } else {
    return createTab(absPageUrl + searchParams);
  }
}

export function getCurrentPageId(): PageId {
  const urlParam = navigation.searchParams.get("page") as PageId;
  return urlParam ?? defaultPageId;
}
