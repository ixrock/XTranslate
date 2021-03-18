import { createObservableHistory } from "mobx-observable-history";
import { createTab, getManifest, getURL } from "./extension";
import { PageId } from "./components/app/views-manager";

export interface PageParams {
  page?: PageId;
}

export const navigation = createObservableHistory();
export const defaultPageId: PageId = "settings";

export function navigate(params: PageParams = {}) {
  const absPageUrl = getURL(getManifest().options_page); // starts with chrome://%extension-id/options.html
  const isLocalRoute = document.location.href.startsWith(absPageUrl);

  const urlParams = navigation.searchParams
    .copyWith(params)
    .toString({ withPrefix: true });

  if (isLocalRoute) {
    navigation.push(urlParams);
  } else {
    return createTab(absPageUrl + urlParams);
  }
}

export function getCurrentPageId(): PageId {
  const urlParam = navigation.searchParams.get("page") as PageId;
  return urlParam ?? defaultPageId;
}
