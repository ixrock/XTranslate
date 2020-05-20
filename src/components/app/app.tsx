//-- Main window app (options page)
import './app.scss'

import * as React from 'react';
import { render } from 'react-dom'
import { reaction, when } from "mobx";
import { observer } from "mobx-react";
import { createObservableHistory } from "mobx-observable-history";
import { cssNames } from "../../utils/cssNames";
import { __i18n, getManifest } from "../../extension";
import { Settings } from '../settings'
import { settingsStore } from '../settings/settings.store'
import { themeStore } from "../theme-manager/theme.store";
import { Footer } from '../footer'
import { Spinner } from "../spinner";
import { Tab, Tabs } from "../tabs";
import { ThemeManager } from "../theme-manager";
import { InputTranslation } from "../input-translation";
import { UserHistory } from "../user-history";
import { Icon } from "../icon";
import { AppRateDialog } from "./app-rate.dialog";
import { Notifications } from "../notifications";
import { AppPageId } from "../../common";

const navigation = createObservableHistory();

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
      url: navigation.getPath(),
      focused: true,
      width: 600,
      height: 700,
      left: 25,
      top: 25,
      type: "popup"
    });
  }

  onTabsChange = (page: AppPageId) => {
    navigation.searchParams.set("page", page);
    window.scrollTo(0, 0);
  }

  render() {
    var { name, version } = this.manifest;
    var { useDarkTheme } = settingsStore.data;
    var pageId = navigation.searchParams.get("page") || AppPageId.settings;
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
          <Tab value={AppPageId.settings} label={__i18n("tab_settings")} icon="settings"/>
          <Tab value={AppPageId.theme} label={__i18n("tab_theme")} icon="color_lens"/>
          <Tab value={AppPageId.popup} label={__i18n("tab_text_input")} icon="translate"/>
          <Tab value={AppPageId.history} label={__i18n("tab_history")} icon="history"/>
        </Tabs>
        <div className="tab-content">
          {pageId === AppPageId.settings && <Settings/>}
          {pageId === AppPageId.theme && <ThemeManager/>}
          {pageId === AppPageId.popup && <InputTranslation/>}
          {pageId === AppPageId.history && <UserHistory/>}
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