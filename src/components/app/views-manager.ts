import React from "react";
import { TabProps } from "../tabs";
import { AppPageId } from "../../navigation";

export interface AppView {
  Tab?: React.ComponentType<TabProps>,
  Page?: React.ComponentType<any>,
}

const tabs = new Map<string, AppView["Tab"]>();
const pages = new Map<string, AppView["Page"]>();

export const viewsManager = {
  getView(pageId: AppPageId): AppView {
    return {
      Tab: tabs.get(pageId),
      Page: pages.get(pageId),
    }
  },

  registerView(pageId: AppPageId, view: AppView) {
    tabs.set(pageId, view.Tab);
    pages.set(pageId, view.Page);
  }
}
