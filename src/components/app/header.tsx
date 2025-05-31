import "./header.scss";
import React from "react";
import { makeObservable } from "mobx";
import { observer } from "mobx-react";
import { cssNames } from "../../utils/cssNames";
import { getTranslator } from "../../providers";
import { getManifest, translateActivePage } from "../../extension";
import { activeTabStorage } from "../../background/tabs.bgc";
import { settingsStore } from '../settings/settings.storage'
import { Tabs } from "../tabs";
import { Icon } from "../icon";
import { getUrlParams, navigate, PageId } from "../../navigation";
import { pageManager } from "./page-manager";
import { getMessage } from "../../i18n";
import { SelectLocaleIcon } from "../select-locale";
import { dialogsState } from "./dialogs-state";

@observer
export class Header extends React.Component {
  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  detachWindow = () => {
    chrome.windows.create({
      url: location.href,
      focused: true,
      width: 650,
      height: 700,
      left: 25,
      top: 25,
      type: "popup"
    });
  }

  private translateActivePage = async () => {
    await translateActivePage();
    window.close();
  }

  private onTabsChange = async (page: PageId) => {
    await navigate({ page });
    window.scrollTo(0, 0);
  }

  render() {
    const { name, version } = getManifest();
    const { page: pageId } = getUrlParams();
    const activeTab = activeTabStorage.get();
    const { useDarkTheme, fullPageTranslation } = settingsStore.data;
    const { provider, langTo, alwaysTranslatePages } = fullPageTranslation;
    const isAutoTranslatingPage = alwaysTranslatePages.includes(new URL(activeTab.url || location.href).origin);

    const translatePageActionTooltip = isAutoTranslatingPage
      ? getMessage("context_menu_translate_full_page_context_menu_stop", {
        site: `"${activeTab.title}" - ${activeTab.url}`,
      })
      : getMessage("context_menu_translate_full_page", {
        lang: getTranslator(provider).langTo[langTo] ?? langTo,
        pageTitle: activeTab.title,
      });

    return (
      <div className="Header">
        <header className="flex gaps align-center">
          <div className="app-title box grow">
            {name} <sup className="app-version">{version}</sup>
          </div>
          <Icon
            small
            material="g_translate"
            active={isAutoTranslatingPage}
            tooltip={translatePageActionTooltip}
            onClick={this.translateActivePage}
          />
          <Icon
            small
            svg="moon"
            active={useDarkTheme}
            tooltip={{ nowrap: true, children: getMessage("use_dark_theme") }}
            className={cssNames("dark-theme-icon", { active: useDarkTheme })}
            onClick={() => settingsStore.data.useDarkTheme = !useDarkTheme}
          />
          <Icon
            small
            material="open_in_new"
            tooltip={{ nowrap: true, children: getMessage("open_in_window") }}
            onClick={this.detachWindow}
          />
          <Icon
            small
            material="import_export"
            tooltip={{ nowrap: true, children: getMessage("import_export_settings") }}
            onClick={() => dialogsState.showImportExportDialog = true}
          />
          <SelectLocaleIcon/>
        </header>
        <Tabs className="Tabs" value={pageId} onChange={this.onTabsChange}>
          {pageManager.getAllRegisteredPageIds().map(pageId => {
            let { Tab } = pageManager.getComponents(pageId);
            if (Tab) {
              return <Tab className="Tab" key={pageId} value={pageId}/>
            }
          })}
        </Tabs>
      </div>
    );
  }
}
