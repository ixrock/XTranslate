import styles from "./export-settings.module.scss";

import React from "react";
import { Dialog, DialogProps } from "../dialog";
import { cssNames, download } from "../../utils";
import { settingsStorage } from "../settings/settings.storage";
import { themeStorage } from "../theme-manager/theme.storage";
import { observer } from "mobx-react";
import { action, makeObservable, observable } from "mobx";
import { getManifest } from "../../extension";
import { Notifications } from "../notifications";
import { Button } from "../button";
import { getMessage } from "../../i18n";
import { Icon } from "../icon";

export interface StorableSettings<Data> {
  version: number;
  data: Data;
}

export interface ImportExportSettings {
  appVersion: string; // manifest.json version
  settings?: StorableSettings<typeof settingsStorage.defaultValue>;
  theme?: StorableSettings<typeof themeStorage.defaultValue>;
}

export interface Props extends DialogProps {
  isOpen: boolean;
}

@observer
export class ExportImportSettingsDialog extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
    makeObservable(this);
  }

  @observable error = "";

  @action.bound
  importSettings({ settings, theme }: ImportExportSettings) {
    try {
      settings && settingsStorage.set(settings.data);
      theme && themeStorage.set(theme.data);
    } catch (error) {
      this.error = String(error);
      Notifications.error(this.error);
    }
  }

  @action.bound
  exportSettings() {
    const filename = "xtranslate-settings.json";
    const version = 1; // TODO: handle compatibilities of supported versions

    const appSettings: ImportExportSettings = {
      appVersion: getManifest().version,
      settings: {
        version: version,
        data: settingsStorage.toJS(),
      },
      theme: {
        version: version,
        data: themeStorage.toJS(),
      },
    };

    download.json(filename, appSettings);
  }

  render() {
    const { className, ...dialogProps } = this.props;
    const dialogClass = cssNames(styles.ExportSettingsDialog, className);

    return (
      <Dialog className={dialogClass} {...dialogProps}>
        <div className="flex column gaps">
          <p className="sub-title">
            <Icon material="import_export"/>
            <span>{getMessage("import_export_settings")}</span>
          </p>
          <div className="flex gaps">
            <Button outline className="flex gaps align-center" onClick={this.exportSettings}>
              <Icon material="save" small/>
              <span>{getMessage("export_settings_button_label")}</span>
            </Button>
            <Button outline className="flex gaps align-center" onClick={() => console.log('todo: open file dialog')}>
              <Icon material="tune" small/>
              <span>{getMessage("import_settings_button_label")}</span>
            </Button>
          </div>
          <p className={styles.error}>
            {this.error}
          </p>
        </div>
      </Dialog>
    )
  }
}

