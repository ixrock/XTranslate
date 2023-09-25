//-- Main window app (options page)

import "./app.scss";
import "../../setup";
import * as React from 'react';
import { createRoot } from "react-dom/client"
import { makeObservable, observable, reaction } from "mobx";
import { observer } from "mobx-react";
import { initAppData } from "../../preload";
import { cssNames } from "../../utils/cssNames";
import { getManifest } from "../../extension";
import { settingsStore } from '../settings/settings.storage'
import { Footer } from '../footer'
import { Spinner } from "../spinner";
import { Tab, Tabs } from "../tabs";
import { Icon } from "../icon";
import { AppRateDialog } from "./app-rate.dialog";
import { Notifications } from "../notifications";
import { ExportImportSettingsDialog } from "../export-import-settings";
import { defaultPageId, getParam, navigate, PageId } from "../../navigation";
import { pageManager } from "./page-manager";
import { getMessage } from "../../i18n";
import { DonationDialog } from "./donation-dialog";

@observer
export class App extends React.Component {
  static manifest = getManifest();
  static pages: PageId[] = ["settings", "theme", "translate", "history"];

  @observable showImportExportDialog = false;
  @observable showDonationDialog = false;

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  static async init(preloadDeps: () => Promise<void>) {
    document.title = App.manifest.name;

    var rootElem = document.getElementById('app');
    var rootNode = createRoot(rootElem);
    rootNode.render(<Spinner center/>); // show loading indicator

    await preloadDeps(); // preload dependent data before initial app rendering

    reaction(() => settingsStore.data.useDarkTheme, App.switchTheme, {
      fireImmediately: true,
    });

    rootNode.render(<App/>);
  }

  static switchTheme(isDark: boolean) {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
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

  onTabsChange = async (page: PageId) => {
    await navigate({ page });
    window.scrollTo(0, 0);
  }

  render() {
    const { name, version } = App.manifest;
    const { useDarkTheme } = settingsStore.data;
    const pageId = getParam("page", defaultPageId);
    const { Page } = pageManager.getComponents(pageId);

    return (
      <div className="App">
        <header className="flex gaps align-center">
          <div className="app-title box grow">
            {name} <sup className="app-version">{version}</sup>
          </div>
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
            onClick={() => this.showImportExportDialog = true}
          />
          <Icon
            small
            material="monetization_on"
            tooltip={{ nowrap: true, children: getMessage("donate_title") }}
            onClick={() => this.showDonationDialog = true}
          />
        </header>
        <Tabs className="Tabs" center value={pageId} onChange={this.onTabsChange}>
          {App.pages.map(pageId => {
            var { Tab } = pageManager.getComponents(pageId);
            if (Tab) return <Tab className="Tab" key={pageId} value={pageId}/>
          })}
        </Tabs>
        <div className="TabContent">
          {Page && <Page/>}
          {!Page && <p className="not-found">Page not found</p>}
        </div>
        <Footer/>
        <Notifications/>
        <AppRateDialog/>
        <DonationDialog
          isOpen={this.showDonationDialog}
          onClose={() => this.showDonationDialog = false}
        />
        <ExportImportSettingsDialog
          isOpen={this.showImportExportDialog}
          onClose={() => this.showImportExportDialog = false}
        />
      </div>
    );
  }
}

// render app
App.init(initAppData);
