import * as styles from "./auth_settings.module.scss";
import React from "react";
import { Icon } from "../icon";
import { ProviderCodeName, TranslatorAuthParams } from "../../providers";
import { prevDefault } from "../../utils";

export interface ProviderAuthSettingsProps extends TranslatorAuthParams, React.PropsWithChildren {
  provider: ProviderCodeName;
  accessInfo: string;
  accessInfo2: string;
  warningInfo: string;
  clearKeyInfo: string;
}

export class ProviderAuthSettings extends React.Component<ProviderAuthSettingsProps> {
  render() {
    const { provider, apiKeySanitized, setupApiKey, clearApiKey, accessInfo, accessInfo2, warningInfo, clearKeyInfo, children } = this.props;

    return (
      <div className="ProviderAuthSettings flex gaps align-center">
        {!apiKeySanitized && (
          <Icon small material="info_outline" tooltip={accessInfo}/>
        )}
        <a className={styles.setupApiKey} onClick={prevDefault(setupApiKey)}>
          {!apiKeySanitized && <>
            <Icon small material="warning_amber" tooltip={warningInfo}/>
            <em>{accessInfo2}</em>
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
