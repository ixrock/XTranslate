//-- Main window app (options page)

import "./app.scss";
import "@/setup";
import React from "react";
import { createRoot } from "react-dom/client"
import { reaction } from "mobx";
import { observer } from "mobx-react";
import { preloadAppData } from "@/preloadAppData";
import { getManifest } from "@/extension";
import { settingsStore } from '../settings/settings.storage'
import { Header } from "./header";
import { Footer } from './footer'
import { Notifications } from "../notifications";
import { getUrlParams } from "@/navigation";
import { pageManager } from "./page-manager";
import { ExportSettingsDialog } from "./export-settings-dialog";
import { PrivacyDialog } from "./privacy-dialog";
import { AppRateDialog } from "./app-rate.dialog";
import { isRTL } from "@/providers";
import { dumpMissingLocalizationKeys, getLocale, i18nStorage } from "@/i18n";
import { sendMetric } from "@/background/metrics.bgc";
import { userStore } from "@/pro";
import { favoritesStorage } from "@/components/user-history/favorites.storage";
import { themeStore } from "@/components/theme-manager/theme.storage";

@observer
export class App extends React.Component {
  static async init() {
    await preloadAppData(); // preload dependent data before initial app rendering
    void userStore.load(); // get latest active subscription info

    const { name: appName, description: appDescription } = getManifest();
    document.title = `${appName} - ${appDescription}`;

    // create DOM placeholder
    const rootElem = document.createElement('div');
    const rootNode = createRoot(rootElem);
    rootElem.id = "XTranslateWindowApp";
    document.body.appendChild(rootElem);

    this.bindDarkThemeSwitching();
    this.bindPageIdWatcher();
    rootNode.render(<App/>);
  }

  static bindDarkThemeSwitching() {
    return reaction(() => settingsStore.data.useDarkTheme, isDark => {
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
    }, {
      fireImmediately: true,
    })
  };

  static bindPageIdWatcher() {
    return reaction(() => getUrlParams().page, pageId => {
      void sendMetric("screen_view", { screen_name: pageId })
    }, {
      fireImmediately: true,
    });
  }

  render() {
    const { page: pageId } = getUrlParams();
    const { Page } = pageManager.getComponents(pageId);
    const direction = isRTL(getLocale()) ? "rtl" : "ltr";

    return (
      <div className="App" style={{ direction }}>
        <Header/>
        <div
          className="PageContent"
          children={Page ? <Page/> : <p className="notFound">Page not found</p>}
        />
        <Footer/>
        <Notifications/>
        <ExportSettingsDialog/>
        <AppRateDialog/>
        <PrivacyDialog affectedVersion="5.1.1"/>
      </div>
    );
  }
}

// render app
void App.init();

export {
  i18nStorage,
  settingsStore,
  userStore,
  themeStore,
  favoritesStorage,
  dumpMissingLocalizationKeys,
}
