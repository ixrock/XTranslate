import * as styles from "./popup_promo.module.scss"

import React from "react";
import { action, makeObservable } from "mobx";
import { observer } from "mobx-react";
import { getXTranslatePro } from "@/providers";
import { getMessage } from "@/i18n";
import { Icon } from "../icon";
import { Button } from "@/components/button";
import { userStore } from "@/pro";
import { sendMetric } from "@/background/metrics.bgc";

@observer
export class PopupPromoBanner extends React.Component<{}> {
  private subscribeBtnRef = React.createRef<Button>();

  constructor(props: {}) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    this.subscribeBtnRef.current?.focus();
    void sendMetric("promo_banner_shown", {});
  }

  @action
  hideBanner() {
    userStore.data.promoBannerShowTime = Date.now();
  }

  render() {
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
