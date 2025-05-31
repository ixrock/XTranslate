import { runInAction } from "mobx";
import { createStorage } from "../storage";
import { getActiveTab } from "../extension";

export const activeTabStorage = createStorage("active_tab", {
  defaultValue: {
    tabId: -1,
    title: "",
    url: "",
  },
});

export function initActiveTabWatcher() {
  async function onTabActivated(info: chrome.tabs.TabActiveInfo) {
    const { id: tabId, title, url } = await getActiveTab();

    const activeTab = activeTabStorage.get();
    runInAction(() => {
      activeTab.tabId = tabId;
      activeTab.title = title;
      activeTab.url = url;
    });
  }

  chrome.tabs.onActivated.addListener(onTabActivated);
  return () => chrome.tabs.onActivated.removeListener(onTabActivated);
}