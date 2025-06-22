import { observable } from "mobx";
import type React from "react";
import type { TabProps } from "../tabs";
import type { PageId } from "@/navigation";

export interface PageComponents {
  Tab?: React.ComponentType<TabProps>;
  Page?: React.ComponentType<any>;
}

const viewsRegistry = observable.map<PageId, PageComponents>([], {
  deep: false, // avoid modifying react components with mobx-stuff
});

export const pageManager = {
  getAllRegisteredPageIds(): PageId[] {
    return Array.from(viewsRegistry.keys());
  },
  getComponents(pageId: PageId): PageComponents {
    return viewsRegistry.get(pageId) ?? {};
  },

  registerComponents(pageId: PageId, views: PageComponents) {
    viewsRegistry.set(pageId, {
      ...(viewsRegistry.get(pageId) ?? {}),
      ...views,
    });
  }
}
