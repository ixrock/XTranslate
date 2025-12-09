import { getXTranslatePro } from "@/providers";
import { getMessage } from "@/i18n";
import { createTab } from "@/extension";

export function proSubscriptionRequiredDialog(): boolean {
  const subscribe = window.confirm(getMessage("pro_required_confirm_goto_subscribe"));
  if (subscribe) {
    const translator = getXTranslatePro();
    void createTab(translator.subscribePageUrl);
    return true;
  }
}
