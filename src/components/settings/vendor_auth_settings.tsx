import * as styles from "./vendor_auth_settings.module.scss";
import React from "react";
import { Icon } from "../icon";
import { cssNames, prevDefault } from "../../utils";

export interface VendorAuthSettingsProps extends React.PropsWithChildren {
  className?: string;
  apiKeySanitized: string;
  setupApiKey: () => void;
  clearApiKey: () => void;
  accessInfo: string;
  accessInfo2: string;
  warningInfo: string;
  clearKeyInfo: string;
}

export class VendorAuthSettings extends React.Component<VendorAuthSettingsProps> {
  render() {
    const { className, apiKeySanitized, setupApiKey, clearApiKey, accessInfo, accessInfo2, warningInfo, clearKeyInfo, children } = this.props;

    return (
      <div className={cssNames(styles.VendorAuthSettings, className)}>
        {!apiKeySanitized && (
          <Icon small material="info_outline" tooltip={accessInfo}/>
        )}
        <div className={styles.setupApiKey} onClick={prevDefault(setupApiKey)}>
          {!apiKeySanitized && <>
            <Icon small material="warning_amber" tooltip={warningInfo}/>
            <em>{accessInfo2}</em>
          </>}
          {apiKeySanitized && <b className={styles.key}>{apiKeySanitized}</b>}
        </div>
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
