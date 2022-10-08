/**
 * Preload app's base settings and all required data before initial rendering.
 */

import { i18nInit } from "./i18n";
import { settingsStore } from "./components/settings/settings.storage";
import { themeStore } from "./components/theme-manager/theme.storage";
import { createLogger } from "./utils/createLogger";

const logger = createLogger({ systemPrefix: `[PRELOAD]` });

export async function preloadAppData() {
  try {
    await Promise.all([
      i18nInit().then(() => logger.info("localization data ready")),
      settingsStore.load().then(() => logger.info("settings data ready")),
      themeStore.load().then(() => logger.info("theming data ready")),
    ]);
    logger.info("initial data ready for rendering");
  } catch (error) {
    logger.error("initial rendering failed due", error);
  }
}
