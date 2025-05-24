import { runInAction } from "mobx";
import { activeTabStorage } from "../components/settings/settings.storage";
import { getActiveTab } from "../extension";

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