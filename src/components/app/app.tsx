//-- Main window app (options page)

import "./app.scss";
import "../../setup";
import React from "react";
import { createRoot } from "react-dom/client"
import { reaction } from "mobx";
import { observer } from "mobx-react";
import { preloadAppData } from "../../preloadAppData";
import { getManifest } from "../../extension";
import { settingsStore } from '../settings/settings.storage'
import { Header } from "./header";
import { Footer } from './footer'
import { Notifications } from "../notifications";
import { getUrlParams } from "../../navigation";
import { pageManager } from "./page-manager";
import { ImportExportSettingsDialog } from "./export-settings-dialog";
import { PrivacyDialog } from "./privacy-dialog";
import { AppRateDialog } from "./app-rate.dialog";
import { dialogsState } from "./dialogs-state";
import { MellowtelDialog } from "../../../mellowtel/mellowtel-dialog";
import { isRTL } from "../../vendors";
import { getLocale } from "../../i18n";

@observer
export class App extends React.Component {
  static async init() {
    await preloadAppData(); // preload dependent data before initial app rendering

    const { name: appName, description: appDescription } = getManifest();
    document.title = `${appName} - ${appDescription}`;

    // create DOM placeholder
    const rootElem = document.createElement('div');
    const rootNode = createRoot(rootElem);
    rootElem.id = "XTranslateWindowApp";
    document.body.appendChild(rootElem);

    App.bindDarkThemeSwitching();
    rootNode.render(<App/>);
  }

  static bindDarkThemeSwitching() {
    return reaction(() => settingsStore.data.useDarkTheme, isDark => {
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
    }, {
      fireImmediately: true,
    })
  };

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
        <ImportExportSettingsDialog
          isOpen={dialogsState.showImportExportDialog}
          onClose={() => dialogsState.showImportExportDialog = false}
        />
        <PrivacyDialog
          isOpen={dialogsState.showPrivacyDialog}
          onTermsAccepted={() => dialogsState.showPrivacyDialog = false}
        />
        <AppRateDialog/>
        <MellowtelDialog/>
      </div>
    );
  }
}

// render app
void App.init();
