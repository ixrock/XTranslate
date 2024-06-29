import * as styles from "./export-settings.module.scss";

import React from "react";
import { Dialog, DialogProps } from "../dialog";
import { cssNames, download } from "../../utils";
import { observer } from "mobx-react";
import { action, makeObservable, observable } from "mobx";
import { getManifest } from "../../extension";
import { Button } from "../button";
import { getMessage } from "../../i18n";
import { Icon } from "../icon";
import { FileInput, ImportingFile } from "../input";
import { Notifications } from "../notifications";
import { SubTitle } from "../sub-title";
import { settingsStorage, SettingsStorageModel } from "../settings/settings.storage";
import { themeStorage, ThemeStorageModel } from "../theme-manager/theme.storage";
import { favoritesStorage, FavoriteStorageModel } from "../user-history/favorites.storage";

export interface StorableSettings<Data> {
  version: number;
  data: Data;
}

export interface ImportExportSettings {
  appVersion: string; // manifest.json version
  settings?: StorableSettings<SettingsStorageModel>;
  theme?: StorableSettings<ThemeStorageModel>;
  favorites?: StorableSettings<FavoriteStorageModel>;
}

export interface Props extends DialogProps {
}

const defaultProps: Partial<Props> = {};

@observer
export class ExportImportSettingsDialog extends React.Component<Props> {
  static defaultProps = defaultProps as unknown as Props;

  readonly fileNameJson = "xtranslate-settings.json";

  @observable.ref dialog: Dialog;
  @observable error = "";

  constructor(props: Props) {
    super(props);
    makeObservable(this);
  }

  @action
  importSettings = async ([{ file }]: ImportingFile<string>[]) => {
    this.error = "";
    try {
      const jsonSettings: ImportExportSettings = JSON.parse(await file.text());
      const { appVersion, settings, theme, favorites } = jsonSettings;
      const noSettingsFound = Boolean(!settings && !theme); // TODO: validate input better
      if (noSettingsFound) {
        const importCommonErrorMessage = getMessage("import_incorrect_file_format", {
          fileNameJson: this.fileNameJson,
        })
        Notifications.error(importCommonErrorMessage);
      } else {
        if (settings) {
          settingsStorage.set(settings.data);
          Notifications.ok(getMessage("imported_setting_successful", { key: "settings" }));
        }
        if (theme) {
          themeStorage.set(theme.data);
          Notifications.ok(getMessage("imported_setting_successful", { key: "theme" }));
        }
        if (favorites) {
          favoritesStorage.set(favorites.data);
          Notifications.ok(getMessage("imported_setting_successful", { key: "favorites" }));
        }
        this.dialog.close();
      }
    } catch (error) {
      console.error(`[SETTINGS-IMPORT]: import failed due: ${error}`);
      this.error = String(error);
      Notifications.error(this.error);
    }
  };

  exportSettings = () => {
    const appSettings: ImportExportSettings = {
      appVersion: getManifest().version,
      settings: {
        version: 1,
        data: settingsStorage.toJS(),
      },
      theme: {
        version: 1,
        data: themeStorage.toJS(),
      },
      favorites: {
        version: 1,
        data: favoritesStorage.toJS(),
      },
    };

    download.json(this.fileNameJson, appSettings);
  };

  render() {
    let fileInput: FileInput;
    const { className, ...dialogProps } = this.props;
    const dialogClass = cssNames(styles.ExportSettingsDialog, className);

    return (
      <Dialog
        {...dialogProps}
        className={dialogClass}
        contentClassName="flex gaps column"
        ref={elem => this.dialog = elem}
      >
        <SubTitle>
          <Icon material="import_export"/>
          <span>{getMessage("import_export_settings")}</span>
        </SubTitle>

        <div className="flex gaps">
          <FileInput
            accept="application/json"
            onImport={this.importSettings}
            ref={elem => fileInput = elem}
          />
          <Button outline className="flex gaps align-center" onClick={this.exportSettings}>
            <Icon material="save" small/>
            <span>{getMessage("export_settings_button_label")}</span>
          </Button>
          <Button outline className="flex gaps align-center" onClick={() => fileInput.selectFiles()}>
            <Icon material="tune" small/>
            <span>{getMessage("import_settings_button_label")}</span>
          </Button>
        </div>

        {this.error && (
          <p className={styles.error}>{this.error}</p>
        )}
      </Dialog>
    )
  }
}

