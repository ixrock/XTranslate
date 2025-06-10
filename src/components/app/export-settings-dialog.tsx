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

export const exportSettingsDialogState = observable.box(false);

export interface ExportingData<Data> {
  data: Data;
}

export interface ExportImportSettings {
  appVersion: string; // manifest.json version
  settings?: ExportingData<SettingsStorageModel>;
  theme?: ExportingData<ThemeStorageModel>;
  favorites?: ExportingData<FavoriteStorageModel>;
  hotkey?: ExportingData<PopupHotkeyStorageModel>;
}

export interface ExportSettingsDialogProps extends Partial<DialogProps> {
}

@observer
export class ExportSettingsDialog extends React.Component<ExportSettingsDialogProps> {
  private readonly appVersion = getManifest().version;
  private readonly fileNameJson = `xtranslate-settings-${this.appVersion}.json`;
  private fileInput: FileInput<string>;

  @observable.ref dialog: Dialog;
  @observable error = "";

  constructor(props: ExportSettingsDialogProps) {
    super(props);
    makeObservable(this);
  }

  @action
  importSettings = async ([{ file }]: ImportingFile<string>[]) => {
    this.error = "";
    try {
      const jsonSettings: ExportImportSettings = JSON.parse(await file.text());
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
    const appSettings: ExportImportSettings = {
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

  get isOpen() {
    return exportSettingsDialogState.get();
  }

  private onClose = () => {
    this.props.onClose?.();
    exportSettingsDialogState.set(false);
  }

  render() {
    const { className, ...dialogProps } = this.props;
    const dialogClass = cssNames(styles.ExportSettingsDialog, className);

    return (
      <Dialog
        {...dialogProps}
        isOpen={this.isOpen}
        onClose={this.onClose}
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
