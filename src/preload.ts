/**
 * Preload app's base settings and all required data before initial rendering.
 */

import { i18nInit } from "./i18n";
import { settingsStore } from "./components/settings/settings.storage";
import { themeStore } from "./components/theme-manager/theme.storage";

export function preloadAppData(): Promise<any>[] {
  return [
    i18nInit(),
    settingsStore.load(),
    themeStore.load(),
  ]
}
