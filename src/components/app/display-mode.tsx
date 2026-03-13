import React from "react";
import { IReactionDisposer, reaction } from "mobx";
import { observer } from "mobx-react";
import { getMessage } from "@/i18n";
import { Icon } from "../icon";
import { getDisplayMode, getNextDisplayMode, isDarkDisplayMode, settingsStore } from "../settings/settings.storage";

@observer
export class DisplayModeToggleIcon extends React.Component {
  private media = window.matchMedia("(prefers-color-scheme: dark)");
  private stopDisplayModeReaction?: IReactionDisposer;
  private unbindSystemTheme?: () => void;

  componentDidMount() {
    this.bindThemeSync();
  }

  componentWillUnmount() {
    this.stopDisplayModeReaction?.();
    this.unbindSystemTheme?.();
  }

  private bindThemeSync() {
    this.stopDisplayModeReaction = reaction(
      () => settingsStore.data.displayMode,
      this.syncDocumentTheme,
      { fireImmediately: true },
    );

    const onSystemThemeChange = () => {
      this.syncDocumentTheme();
      this.forceUpdate();
    };

    if (typeof this.media.addEventListener === "function") {
      this.media.addEventListener("change", onSystemThemeChange);
      this.unbindSystemTheme = () => this.media.removeEventListener("change", onSystemThemeChange);
      return;
    }

    this.media.addListener(onSystemThemeChange);
    this.unbindSystemTheme = () => this.media.removeListener(onSystemThemeChange);
  }

  private syncDocumentTheme = () => {
    const displayMode = getDisplayMode(settingsStore.data.displayMode);
    const isDark = isDarkDisplayMode(displayMode, this.media.matches);

    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.dataset.displayMode = displayMode;
  }

  private toggleDisplayMode = () => {
    const currentDisplayMode = getDisplayMode(settingsStore.data.displayMode);
    settingsStore.data.displayMode = getNextDisplayMode(currentDisplayMode);
  }

  render() {
    const displayMode = getDisplayMode(settingsStore.data.displayMode);
    const isDark = isDarkDisplayMode(displayMode, this.media.matches);
    const materialIcon = displayMode === "auto" ? "brightness_medium" : (isDark ? "dark_mode" : "light_mode");
    const tooltip = <>{getMessage("use_dark_theme")}: <b>{displayMode}</b></>;

    return (
      <Icon
        small
        material={materialIcon}
        active={isDark}
        tooltip={{ nowrap: true, children: tooltip }}
        onClick={this.toggleDisplayMode}
      />
    );
  }
}
