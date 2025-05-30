/**
 * Preload app's base settings and all required data before initial rendering.
 */

import { i18nInit } from "./i18n";
import { createLogger, LoggerColor } from "./utils/createLogger";
import { settingsStore } from "./components/settings/settings.storage";
import { themeStore } from "./components/theme-manager/theme.storage";
import { favoritesStorage } from "./components/user-history/favorites.storage";

export async function preloadAppData() {
  const logger = createLogger({ systemPrefix: `[PRELOAD]`, prefixColor: LoggerColor.INFO_SYSTEM });
  const loadingTimer = logger.time("preloadAppData()");

  try {
    loadingTimer.start();
    await Promise.all([
      i18nInit(),
      settingsStore.load(),
      themeStore.load(),
      favoritesStorage.load(),
    ]);
    loadingTimer.stop();
  } catch (error) {
    logger.error(`data fetching failed: ${error}`);
  }
}
