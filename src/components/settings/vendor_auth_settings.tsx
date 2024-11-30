import * as styles from "./vendor_auth_settings.module.scss";
import React from "react";
import { observer } from "mobx-react";
import { Icon } from "../icon";
import { cssNames, prevDefault } from "../../utils";
import { IComputedValue, makeObservable } from "mobx";

export interface VendorAuthSettingsProps extends React.PropsWithChildren {
  className?: string;
  apiKey?: IComputedValue<string>;
  setupApiKey: () => void;
  clearApiKey: () => void;
  accessInfo: string;
  accessInfo2: string;
  warningInfo: string;
  clearKeyInfo: string;
}

@observer
export class VendorAuthSettings extends React.Component<VendorAuthSettingsProps> {
  constructor(props: VendorAuthSettingsProps) {
    super(props);
    makeObservable(this);
  }

  get sanitizedApiKey() {
    const apiKey = this.props.apiKey.get();
    if (!apiKey) return "";
    return apiKey.substring(0, 4) + "-****-" + apiKey.substring(apiKey.length - 4);
  }

  render() {
    const apiKey = this.props.apiKey.get();
    const { className, setupApiKey, clearApiKey, accessInfo, accessInfo2, warningInfo, clearKeyInfo, children } = this.props;

    return (
      <div className={cssNames(styles.VendorAuthSettings, className)}>
        {!apiKey && (
          <Icon small material="info_outline" tooltip={accessInfo}/>
        )}
        <div className={styles.setupApiKey} onClick={prevDefault(setupApiKey)}>
          <Icon small material="warning_amber" tooltip={warningInfo}/>
          <small>
            {!apiKey && <em>{accessInfo2}</em>}
            {apiKey && <b className={styles.key}>{this.sanitizedApiKey}</b>}
          </small>
        </div>
        {apiKey && <Icon
          small
          material="clear"
          onClick={clearApiKey}
          tooltip={clearKeyInfo}
        />}
        {apiKey && children}
      </div>
    )
  }
}
