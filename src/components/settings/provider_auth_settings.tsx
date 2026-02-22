import * as styles from "./provider_auth_settings.module.scss";
import React from "react";
import { Icon } from "../icon";
import { ProviderCodeName, TranslatorAuthParams } from "@/providers";
import { prevDefault, cssNames } from "@/utils";

export interface ProviderAuthSettingsProps extends TranslatorAuthParams, React.PropsWithChildren {
  provider: ProviderCodeName;
  accessInfo: string;
  accessInfoSetupSteps: string;
  clearKeyInfo: string;
}

export class ProviderAuthSettings extends React.Component<ProviderAuthSettingsProps> {
  render() {
    const { provider, apiKeySanitized, setupApiKey, clearApiKey, accessInfo, accessInfoSetupSteps, clearKeyInfo, children } = this.props;
    const className = cssNames(styles.ProviderAuthSettings, "flex gaps align-center", {
      [styles.hasKey]: !!apiKeySanitized,
    });

    return (
      <div className={className}>
        <a className={`${styles.setupApiKey} flex gaps align-center`} onClick={prevDefault(setupApiKey)}>
          {!apiKeySanitized && <>
            <Icon small material="warning_amber" tooltip={accessInfoSetupSteps}/>
            <em>{accessInfo}</em>
          </>}
          <span className={`${provider}_apiKey`}>{apiKeySanitized}</span>
        </a>
        {apiKeySanitized && <Icon
          small
          material="clear"
          onClick={clearApiKey}
          tooltip={clearKeyInfo}
        />}
        {apiKeySanitized && children}
      </div>
    )
  }
}
