import { getXTranslatePro, ProviderCodeName } from "@/providers";
import { userSubscriptionStore } from "@/pro/user.storage";
import { getMessage } from "@/i18n";
import { createTab } from "@/extension";

export function checkProSubscriptionAvailability(currentProvider: ProviderCodeName, fallbackAction: () => void) {
  const { isProEnabled } = userSubscriptionStore;

  if (currentProvider === ProviderCodeName.XTRANSLATE_PRO && !isProEnabled) {
    const translator = getXTranslatePro();

    const subscribe = window.confirm(getMessage("pro_required_confirm_goto_subscribe"));
    if (subscribe) {
      void createTab(translator.subscribePageUrl);
    } else {
      // reset to defaults since user at this point doesn't want to subscribe == PRO-apis won't work
      fallbackAction();
    }
  }
}
