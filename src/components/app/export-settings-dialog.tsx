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
import { popupHotkey, PopupHotkeyStorageModel, settingsStorage, SettingsStorageModel } from "../settings/settings.storage";
import { themeStorage, ThemeStorageModel } from "../theme-manager/theme.storage";
import { favoritesStorage, FavoriteStorageModel } from "../user-history/favorites.storage";

export interface StorableSettings<Data> {
  data: Data;
}

export interface ImportExportSettings {
  appVersion: string; // manifest.json version
  settings?: StorableSettings<SettingsStorageModel>;
  theme?: StorableSettings<ThemeStorageModel>;
  favorites?: StorableSettings<FavoriteStorageModel>;
  hotkey?: StorableSettings<PopupHotkeyStorageModel>;
}

export interface ImportExportSettingsDialogProps extends DialogProps {
}

const defaultProps: Partial<ImportExportSettingsDialogProps> = {};

@observer
export class ImportExportSettingsDialog extends React.Component<ImportExportSettingsDialogProps> {
  static defaultProps = defaultProps as unknown as ImportExportSettingsDialogProps;

  readonly appVersion = getManifest().version;
  readonly fileNameJson = `xtranslate-settings-${this.appVersion}.json`;
  private fileInput: FileInput<string>;

  @observable.ref dialog: Dialog;
  @observable error = "";

  constructor(props: ImportExportSettingsDialogProps) {
    super(props);
    makeObservable(this);
  }

  @action
  importSettings = async ([{ file }]: ImportingFile<string>[]) => {
    this.error = "";
    try {
      const jsonSettings: ImportExportSettings = JSON.parse(await file.text());
      const { appVersion, settings, theme, favorites, hotkey } = jsonSettings;
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
        if (hotkey) {
          popupHotkey.set(hotkey.data);
          Notifications.ok(getMessage("imported_setting_successful", { key: "hotkey" }));
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
      appVersion: this.appVersion,
      settings: {
        data: settingsStorage.toJS(),
      },
      theme: {
        data: themeStorage.toJS(),
      },
      favorites: {
        data: favoritesStorage.toJS(),
      },
      hotkey: {
        data: popupHotkey.toJS(),
      }
    };

    download.json(this.fileNameJson, appSettings);
  };

  render() {
    const { className, ...dialogProps } = this.props;
    const dialogClass = cssNames(styles.ExportSettingsDialog, className);

    return (
      <Dialog
        {...dialogProps}
        className={dialogClass}
        contentClassName="flex gaps column"
        ref={elem => {
          this.dialog = elem
        }}
      >
        <SubTitle>
          <Icon material="import_export"/>
          <span>{getMessage("import_export_settings")}</span>
        </SubTitle>

        <div className="flex gaps">
          <FileInput
            accept="application/json"
            outputType="text"
            onImport={this.importSettings}
            ref={elem => {
              this.fileInput = elem;
            }}
          />
          <Button outline className="flex gaps align-center" onClick={this.exportSettings}>
            <Icon material="save" small/>
            <span>{getMessage("export_settings_button_label")}</span>
          </Button>
          <Button outline className="flex gaps align-center" onClick={() => this.fileInput.selectFiles()}>
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

