import "./header.scss";
import React from "react";
import { makeObservable } from "mobx";
import { observer } from "mobx-react";
import { isSystemPage, websiteURL } from "@/config";
import { cssNames } from "@/utils/cssNames";
import { getTranslator } from "@/providers";
import { getManifest, translateActivePage } from "@/extension";
import { activeTabStorage } from "@/background/tabs.bgc";
import { settingsStore } from '../settings/settings.storage'
import { Tabs } from "../tabs";
import { Icon } from "../icon";
import { getUrlParams, navigate, PageId } from "@/navigation";
import { pageManager } from "./page-manager";
import { getLocale, getMessage } from "@/i18n";
import { SelectLocaleIcon } from "../select-locale";
import { Tooltip } from "../tooltip";
import { exportSettingsDialogState } from "./export-settings-dialog";

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
    void translateActivePage();
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
    const showTranslateIcon = !isSystemPage(activeTab.url);
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
          <div className="app-title">
            {name} <sup className="app-version">{version}</sup>
          </div>
          <div className="box grow flex justify-center">
            <a
              id="pro-discount"
              href={`${websiteURL}/early-access?source=extension&lang=${getLocale()}`}
              target="_blank"
            >
              <Icon small material="discount"/>
              <span>{getMessage("pro_version_promo_link_text")}</span>
            </a>
            <Tooltip anchorId="pro-discount" following>
              <div className="flex gaps align-center">
                <Icon small material="auto_fix_high" />
                <span>{getMessage("pro_version_promo_tooltip")}</span>
              </div>
            </Tooltip>
          </div>
          {showTranslateIcon && (
            <Icon
              small
              material="g_translate"
              active={isAutoTranslatingPage}
              tooltip={translatePageActionTooltip}
              onClick={this.translateActivePage}
            />
          )}
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
            onClick={() => exportSettingsDialogState.set(true)}
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
