import "./header.scss";
import React from 'react';
import { observable } from "mobx";
import { observer } from "mobx-react";
import { cssNames } from "../../utils/cssNames";
import { getManifest } from "../../extension";
import { settingsStore } from '../settings/settings.storage'
import { Tab, Tabs } from "../tabs";
import { Icon } from "../icon";
import { defaultPageId, getParam, navigate, PageId } from "../../navigation";
import { pageManager } from "./page-manager";
import { getMessage } from "../../i18n";
import { SelectLocaleMenu } from "../select-locale";

@observer
export class Header extends React.Component {
  static dialogs = observable({
    showImportExportDialog: false,
    showDonationDialog: false,
    showPrivacyDialog: false,
  });

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
    const { name, version } = getManifest();
    const { useDarkTheme } = settingsStore.data;
    const pageId = getParam("page", defaultPageId);

    return (
      <div className="Header">
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
            onClick={() => Header.dialogs.showImportExportDialog = true}
          />
          <SelectLocaleMenu/>
        </header>
        <Tabs className="Tabs" center value={pageId} onChange={this.onTabsChange}>
          {pageManager.getAllRegisteredPageIds().map(pageId => {
            var { Tab } = pageManager.getComponents(pageId);
            if (Tab) {
              return <Tab className="Tab" key={pageId} value={pageId}/>
            }
          })}
        </Tabs>
      </div>
    );
  }
}
