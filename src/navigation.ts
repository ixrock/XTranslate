import { createObservableHistory } from "mobx-observable-history";
import { getManifest, getURL } from "./extension";

export const navigation = createObservableHistory();

export interface AppRouteParams {
  page?: AppPageId;
}

export enum AppPageId {
  settings = "settings",
  theme = "theme",
  popup = "popup",
  history = "history",
}

export const defaultRouteParams: AppRouteParams = {
  page: AppPageId.settings,
}

export function navigate(params: AppRouteParams) {
  navigation.merge({
    search: buildURL(params)
  });
}

export function buildURL(params: AppRouteParams = {}, { absPath = false } = {}) {
  var pageUrl = absPath ? getURL(getManifest().options_page) : "";
  pageUrl += "?" + new URLSearchParams(Object.entries(params));
  return pageUrl;
}

export function getRouteParams({ withDefaults = true } = {}): AppRouteParams {
  return Object.entries(defaultRouteParams).reduce((routeParams, [param, value]) => {
    routeParams[param] = navigation.searchParams.get(param);
    if (withDefaults && !routeParams[param]) {
      routeParams[param] = value;
    }
    return routeParams
  }, {})
}
