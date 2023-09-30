/**
 * Preload app's base settings and all required data before initial rendering.
 */

import { i18nInit } from "./i18n";
import { settingsStore } from "./components/settings/settings.storage";
import { themeStore } from "./components/theme-manager/theme.storage";
import { createLogger } from "./utils/createLogger";
import { favoritesStorage } from "./components/user-history/favorites.storage";

const logger = createLogger({ systemPrefix: `[PRELOAD]` });

export async function preloadAppData() {
  try {
    await Promise.all([
      i18nInit().then(() => logger.info("localization data ready")),
      settingsStore.load().then(() => logger.info("settings data ready")),
      themeStore.load().then(() => logger.info("theming data ready")),
      favoritesStorage.load().then(() => logger.info("favorites data ready")),
    ]);
    logger.info("INITIAL DATA READY/PRELOADED");
  } catch (error) {
    logger.error("INITIAL DATA PRELOADING FAILED", { error });
  }
}
