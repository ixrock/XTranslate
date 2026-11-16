import React, { useEffect, useCallback } from "react";
import { getMessage } from "@/i18n";
import { Notifications } from "@/components/notifications";
import { userStore } from "@/pro";
import { Button } from "@/components/button";
import { getXTranslatePro } from "@/providers";
import { Icon } from "@/components/icon";

export function useProLiteBannerNotification() {
  const hideBanner = useCallback(() => {
    userStore.hideProLiteBanner();
  }, []);

  useEffect(() => {
    let isMounted = true;

    void userStore.whenReady.then(() => {
      if (!isMounted || userStore.isPaidUser) return;
      if (!userStore.showProLiteBanner) return;

      Notifications.info(
        <p className="flex column gaps">
          <b>{getMessage("pro_got_cheaper_banner")}</b>
          <span>
            {getMessage("pro_upgrade_button_tooltip", {
              pricePerMonth: userStore.pricePerMonth,
            })}
          </span>
          <Button
            outline
            target="_blank"
            href={getXTranslatePro().subscribePageUrl}
            onClick={hideBanner}
          >
            {getMessage("pro_version_subscribe_button")}{" "}
            <Icon material="rocket_launch"/>
          </Button>
        </p>,
        hideBanner,
      );
    });

    return () => {
      isMounted = false;
    };
  }, []);
}
