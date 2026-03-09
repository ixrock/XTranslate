// App's storage helpers

import { userStore } from "@/pro";
import { i18nStorage } from "@/i18n";
import { privacyPolicyStorage } from "@/components/app";
import { rateButtonClicked, rateLastTimestamp } from "@/components/app/app-rate.storage";
import { fullPageTranslateHotkey, popupHotkey, popupSkipInjectionUrls, settingsStorage } from "@/components/settings/settings.storage";
import { favoritesStorage } from "@/components/user-history/favorites.storage";
import { customFont, themeStorage } from "@/components/theme-manager/theme.storage";
import { historyStorage } from "@/components/user-history/history.storage";
import { pageTranslationStorage } from "@/user-script/page-translator";

export {
  userStore,
  i18nStorage,
  historyStorage,
  favoritesStorage,
  themeStorage,
  customFont,
  settingsStorage,
  popupHotkey,
  popupSkipInjectionUrls,
  fullPageTranslateHotkey,
  privacyPolicyStorage,
  rateButtonClicked,
  rateLastTimestamp,
  pageTranslationStorage,
}
