import "./header.scss";
import React from "react";
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { cssNames } from "../../utils/cssNames";
import { getTranslator } from "../../providers";
import { BrowserTab, getActiveTab, getManifest, translateActivePage } from "../../extension";
import { settingsStore } from '../settings/settings.storage'
import { Tabs } from "../tabs";
import { Icon } from "../icon";
import { getUrlParams, navigate, PageId } from "../../navigation";
import { pageManager } from "./page-manager";
import { getMessage } from "../../i18n";
import { SelectLocaleIcon } from "../select-locale";
import { dialogsState } from "./dialogs-state";
import { isSystemPage } from "../../common-vars";

@observer
export class Header extends React.Component {
  @observable activeTab: BrowserTab = undefined;

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  @action
  async componentDidMount() {
    this.activeTab = await getActiveTab();
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
    const ok = await translateActivePage();
    if (ok !== false) window.close();
  }

  private onTabsChange = async (page: PageId) => {
    await navigate({ page });
    window.scrollTo(0, 0);
  }

  render() {
    const { name, version } = getManifest();
    const { page: pageId } = getUrlParams();
    const { useDarkTheme, fullPageTranslation: { provider, langTo } } = settingsStore.data;
    const runtimeInteractive = !isSystemPage(this.activeTab?.url);

    const translateFullPageTooltip = runtimeInteractive && getMessage("context_menu_translate_full_page", {
      lang: getTranslator(provider).langTo[langTo] ?? langTo,
      pageTitle: this.activeTab?.title ?? "Untitled",
    });

    return (
      <div className="Header">
        <header className="flex gaps align-center">
          <div className="app-title box grow">
            {name} <sup className="app-version">{version}</sup>
          </div>
          {runtimeInteractive && (
            <Icon
              small
              material="g_translate"
              tooltip={translateFullPageTooltip}
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
