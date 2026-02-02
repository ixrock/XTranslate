import * as styles from "./popup_promo.module.scss"

import React from "react";
import { action, makeObservable } from "mobx";
import { observer } from "mobx-react";
import { getXTranslatePro } from "@/providers";
import { getMessage } from "@/i18n";
import { Icon } from "../icon";
import { Button } from "@/components/button";
import { settingsStore } from "../settings/settings.storage";
import { userStore } from "@/pro";

@observer
export class PopupPromoBanner extends React.Component<{}> {
  private subscribeBtnRef = React.createRef<Button>();

  static get isVisible(): boolean {
    if (userStore.isProActive) {
      return false;
    }

    const promoSkippedLastTime = settingsStore.data.showPopupPromoBannerLastTimestamp || 0;
    const remindPromoDelay = 90 * 24 * 60 * 60 * 1000; // every 3 months

    return !promoSkippedLastTime || (
      promoSkippedLastTime + remindPromoDelay <= Date.now()
    );
  }

  constructor(props: {}) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    this.subscribeBtnRef.current?.focus();
  }

  @action.bound
  hideBanner() {
    settingsStore.data.showPopupPromoBannerLastTimestamp = Date.now();
  }

  render() {
    if (!PopupPromoBanner.isVisible) {
      return;
    }

    return (
      <div className={styles.PopupPromo}>
        <div>
          <Icon material="celebration"/>{" "}
          <b>{getMessage("popup_info_banner_pro_available")}</b>
        </div>
        <div>
          <b>{getMessage("pro_version_subscribe_price", {
            priceMonthly: userStore.pricePerMonth,
          })}</b>
          <ul>
            <li>{getMessage("pro_version_ai_translator", { provider: "Gemini" })}</li>
            <li>{getMessage("pro_version_ai_tts", { provider: "OpenAI" })}</li>
            <li>{getMessage("pro_version_ai_summarize_feature")}</li>
          </ul>
        </div>
        <div className={styles.promoActionButtons}>
          <Button
            outline
            label={getMessage("pro_version_continue_use_free_version")}
            onClick={this.hideBanner}
          />
          <Button
            primary
            target="_blank"
            href={getXTranslatePro().subscribePageUrl}
            ref={this.subscribeBtnRef}
          >
            {getMessage("pro_version_subscribe_button")}{" "}
            <Icon material="rocket_launch"/>
          </Button>
        </div>
      </div>
    )
  }
}
