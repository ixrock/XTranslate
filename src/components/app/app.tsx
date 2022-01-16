//-- Main window app (options page)

import "./app.scss";
import "../../packages.setup";
import * as React from 'react';
import { render } from 'react-dom'
import { reaction } from "mobx";
import { observer } from "mobx-react";
import { cssNames } from "../../utils/cssNames";
import { getManifest } from "../../extension";
import { settingsStore } from '../settings/settings.storage'
import { themeStore } from "../theme-manager/theme.storage";
import { Footer } from '../footer'
import { Spinner } from "../spinner";
import { Tab, Tabs } from "../tabs";
import { Icon } from "../icon";
import { AppRateDialog } from "./app-rate.dialog";
import { Notifications } from "../notifications";
import { defaultPageId, getParam, navigate, PageId } from "../../navigation";
import { viewsManager } from "./views-manager";
import { getMessage, i18nInit } from "../../i18n";

@observer
export class App extends React.Component {
  static manifest = getManifest();
  static pages: PageId[] = ["settings", "theme", "translate", "history"];

  static async init() {
    document.title = App.manifest.name;

    var appRootElem = document.getElementById('app');
    render(<Spinner center/>, appRootElem); // show loading indicator

    // wait for dependent data before render
    await Promise.all([
      i18nInit(),
      settingsStore.ready,
      themeStore.ready,
    ]);

    reaction(() => settingsStore.data.useDarkTheme, App.switchTheme, {
      fireImmediately: true,
    });

    render(<App/>, appRootElem);
  }

  static switchTheme(isDark: boolean) {
    document.body.classList.toggle("theme-dark", isDark);
  }

  detachWindow = () => {
    chrome.windows.create({
      url: location.href,
      focused: true,
      width: 600,
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
    const pageId = getParam("page") as PageId ?? defaultPageId;
    const { Page: TabContent } = viewsManager.getPageById(pageId);
    return (
      <div className="App">
        <header className="flex gaps">
          <div className="app-title box grow">
            {name} <sup className="app-version">{version}</sup>
          </div>
          <Icon
            svg="moon"
            tooltip={{ nowrap: true, children: getMessage("use_dark_theme") }}
            className={cssNames("dark-theme-icon", { active: useDarkTheme })}
            onClick={() => settingsStore.data.useDarkTheme = !useDarkTheme}
          />
          <Icon
            material="open_in_new"
            tooltip={{ nowrap: true, children: getMessage("open_in_window") }}
            onClick={this.detachWindow}
          />
        </header>
        <Tabs center value={pageId} onChange={this.onTabsChange}>
          {App.pages.map(pageId => {
            var { Tab } = viewsManager.getPageById(pageId);
            if (Tab) return <Tab key={pageId} value={pageId}/>
          })}
        </Tabs>
        <div className="tab-content flex column">
          {TabContent && <TabContent/>}
          {!TabContent && <p className="box center">Page not found</p>}
        </div>
        <Footer/>
        <Notifications/>
        <AppRateDialog/>
      </div>
    );
  }
}

// init app
App.init();