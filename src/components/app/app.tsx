//-- Main window app (options page)

import "./app.scss";
import "../../setup";
import * as React from 'react';
import { createRoot } from "react-dom/client"
import { reaction } from "mobx";
import { observer } from "mobx-react";
import { preloadAppData } from "../../preloadAppData";
import { getManifest } from "../../extension";
import { settingsStore } from '../settings/settings.storage'
import { Header } from "./header";
import { Footer } from './footer'
import { Spinner } from "../spinner";
import { Notifications } from "../notifications";
import { defaultPageId, getParam } from "../../navigation";
import { pageManager } from "./page-manager";
import { DonationDialog } from "./donation-dialog";
import { ExportImportSettingsDialog } from "../export-import-settings";
import { PrivacyDialog } from "./privacy-dialog";
import { AppRateDialog } from "./app-rate.dialog";

@observer
export class App extends React.Component {
  static async init(preloadDeps: () => Promise<void>) {
    await preloadDeps(); // preload dependent data before initial app rendering

    const { name: appName, description: appDescription } = getManifest();
    document.title = `${appName} - ${appDescription}`;

    var rootElem = document.getElementById('app');
    var rootNode = createRoot(rootElem);
    rootNode.render(<Spinner center/>); // show loading indicator

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
    const pageId = getParam("page", defaultPageId);
    const { Page } = pageManager.getComponents(pageId);

    return (
      <div className="App">
        <Header/>
        <div
          className="PageContent"
          children={Page ? <Page/> : <p className="notFound">Page not found</p>}
        />
        <Footer/>
        <Notifications/>
        <DonationDialog
          isOpen={Header.dialogs.showDonationDialog}
          onClose={() => Header.dialogs.showDonationDialog = false}
        />
        <ExportImportSettingsDialog
          isOpen={Header.dialogs.showImportExportDialog}
          onClose={() => Header.dialogs.showImportExportDialog = false}
        />
        <PrivacyDialog
          isOpen={Header.dialogs.showPrivacyDialog}
          onClose={() => Header.dialogs.showPrivacyDialog = false}
        />
        <AppRateDialog/>
      </div>
    );
  }
}

// render app
App.init(preloadAppData);
