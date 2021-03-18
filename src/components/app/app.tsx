//-- Main window app (options page)
import './app.scss'

import * as React from 'react';
import { render } from 'react-dom'
import { reaction } from "mobx";
import { observer } from "mobx-react";
import { cssNames } from "../../utils/cssNames";
import { __i18n, getManifest } from "../../extension";
import { settingsStore } from '../settings/settings.storage'
import { themeStore } from "../theme-manager/theme.storage";
import { Footer } from '../footer'
import { Spinner } from "../spinner";
import { Tab, Tabs } from "../tabs";
import { Icon } from "../icon";
import { AppRateDialog } from "./app-rate.dialog";
import { Notifications } from "../notifications";
import { getCurrentPageId, navigate } from "../../navigation";
import { PageId, viewsManager } from "./views-manager";

@observer
export class App extends React.Component {
  static manifest = getManifest();
  static pages: PageId[] = ["settings", "theme", "popup", "history"];

  static async init() {
    var appRootElem = document.getElementById('app');
    render(<Spinner center/>, appRootElem); // show loading indicator
    await Promise.allSettled([settingsStore.ready, themeStore.ready]); // wait stores initialization
    render(<App/>, appRootElem);
  }

  componentDidMount() {
    this.setUpTheme();
    reaction(() => settingsStore.data.useDarkTheme, this.setUpTheme);
    document.title = App.manifest.name;
  }

  setUpTheme = () => {
    document.body.classList.toggle('theme-dark', settingsStore.data.useDarkTheme);
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
    const pageId = getCurrentPageId();
    const { Page: TabContent } = viewsManager.getPageById(pageId);
    return (
      <div className="App">
        <header className="flex gaps">
          <div className="app-title box grow">
            {name} <sup className="app-version">{version}</sup>
          </div>
          <Icon
            svg="moon"
            tooltip={{ nowrap: true, children: __i18n("use_dark_theme") }}
            className={cssNames("dark-theme-icon", { active: useDarkTheme })}
            onClick={() => settingsStore.data.useDarkTheme = !useDarkTheme}
          />
          <Icon
            material="open_in_new"
            tooltip={{ nowrap: true, children: __i18n("open_in_window") }}
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