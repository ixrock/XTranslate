import type { TabProps } from "../tabs";
import type React from "react";
import { observable } from "mobx";

export type PageId = "settings" | "theme" | "popup" | "history";

export interface PageComponents {
  Tab?: React.ComponentType<TabProps>;
  Page?: React.ComponentType<any>;
}

const viewsRegistry = observable.map<PageId, PageComponents>();

export const viewsManager = {
  getPageById(pageId: PageId): PageComponents {
    return viewsRegistry.get(pageId) ?? {};
  },

  registerPages(pageId: PageId, views: PageComponents) {
    viewsRegistry.set(pageId, {
      ...(viewsRegistry.get(pageId) ?? {}),
      ...views,
    });
  }
}
