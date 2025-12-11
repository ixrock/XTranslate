/**
 * Preload app's base settings and all required data before initial rendering.
 */

import { i18nInit } from "./i18n";
import { createLogger, LoggerColor } from "./utils/createLogger";
import { settingsStore } from "./components/settings/settings.storage";
import { themeStore } from "./components/theme-manager/theme.storage";
import { favoritesStorage } from "./components/user-history/favorites.storage";
import { userStore } from "@/pro";

export async function preloadAppData({ forceUserLoad = false } = {}) {
  const logger = createLogger({ systemPrefix: `[PRELOAD]`, prefixColor: LoggerColor.INFO_SYSTEM });
  const loadingTimer = logger.time("preloadAppData()");

  try {
    loadingTimer.start();
    await Promise.all([
      i18nInit(),
      settingsStore.load(),
      themeStore.load(),
      favoritesStorage.load(),
      userStore.load({ force: forceUserLoad }),
    ]);
    loadingTimer.stop();
  } catch (error) {
    logger.error(`data fetching failed: ${error}`);
  }
}
