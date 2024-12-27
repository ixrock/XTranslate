import "./header.scss";
import React from "react";
import { observer } from "mobx-react";
import { cssNames } from "../../utils/cssNames";
import { getManifest } from "../../extension";
import { settingsStore } from '../settings/settings.storage'
import { Tab, Tabs } from "../tabs";
import { Icon } from "../icon";
import { getUrlParams, navigate, PageId } from "../../navigation";
import { pageManager } from "./page-manager";
import { getMessage } from "../../i18n";
import { SelectLocale } from "../select-locale";
import { dialogsState } from "./dialogs-state";

@observer
export class Header extends React.Component {
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
    const { page: pageId } = getUrlParams();
    const { useDarkTheme } = settingsStore.data;

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
            onClick={() => dialogsState.showImportExportDialog = true}
          />
          <SelectLocale/>
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
