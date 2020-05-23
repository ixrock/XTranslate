//-- Main window app (options page)
import './app.scss'

import * as React from 'react';
import { render } from 'react-dom'
import { reaction, when } from "mobx";
import { observer } from "mobx-react";
import { cssNames } from "../../utils/cssNames";
import { __i18n, getManifest } from "../../extension";
import { settingsStore } from '../settings/settings.store'
import { themeStore } from "../theme-manager/theme.store";
import { Footer } from '../footer'
import { Spinner } from "../spinner";
import { Tab, Tabs } from "../tabs";
import { Icon } from "../icon";
import { AppRateDialog } from "./app-rate.dialog";
import { Notifications } from "../notifications";
import { AppPageId, getRouteParams, navigate } from "../../navigation";
import { viewsManager } from "./views-manager";

@observer
export class App extends React.Component {
  public manifest = getManifest();

  static async init() {
    var appRootElem = document.getElementById('app');
    render(<Spinner center/>, appRootElem); // show loading indicator
    await when(() => settingsStore.isLoaded && themeStore.isLoaded); // wait stores initialization
    render(<App/>, appRootElem);
  }

  componentDidMount() {
    this.setUpTheme();
    reaction(() => settingsStore.data.useDarkTheme, this.setUpTheme);
    document.title = this.manifest.name;
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

  onTabsChange = (page: AppPageId) => {
    navigate({ page });
    window.scrollTo(0, 0);
  }

  render() {
    var { name, version } = this.manifest;
    var { useDarkTheme } = settingsStore.data;
    var { page: pageId } = getRouteParams();
    var { Page: TabContent } = viewsManager.getView(pageId);
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
          {Object.values(AppPageId).map(pageId => {
            var { Tab } = viewsManager.getView(pageId);
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