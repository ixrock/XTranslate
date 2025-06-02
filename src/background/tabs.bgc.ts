import { createStorage } from "../storage";
import { getActiveTab } from "../extension";

export const activeTabStorage = createStorage("active_tab", {
  defaultValue: {
    tabId: 0,
    title: "",
    url: "",
  },
});

export function initActiveTabWatcher() {
  chrome.tabs.onActivated.addListener(onTabActivated);
  chrome.tabs.onUpdated.addListener(onTabUpdated);

  return () => {
    chrome.tabs.onActivated.removeListener(onTabActivated);
    chrome.tabs.onUpdated.removeListener(onTabUpdated);
  };
}

async function onTabActivated() {
  const { id: tabId, title, url } = await getActiveTab();
  activeTabStorage.merge({ tabId, title, url });
}

async function onTabUpdated(updatedTabId: number, { url, title }: chrome.tabs.TabChangeInfo) {
  const activeTab = activeTabStorage.get();

  if (activeTab.tabId === updatedTabId) {
    if (url) activeTab.url = url;
    if (title) activeTab.title = title;
  }
}
