import style from "./donation-dialog.module.scss"

import React from "react";
import { observer } from "mobx-react";
import { Dialog, DialogProps } from "../dialog";
import { getMessage } from "../../i18n";
import { cssNames } from "../../utils";
import { Icon } from "../icon";
import { Checkbox } from "../checkbox";
import { settingsStore } from "../settings/settings.storage";

@observer
export class DonationDialog extends React.Component<DialogProps> {
  #btcWallet = '1FuwS2M3JpwGRdZqh5kZZtcM36788xthu6';
  #ethWallet = '0x86ef84b008cf69fa5479e87f1ae82c5d1c47164b';

  private copyToBuffer(text: string) {
    return navigator.clipboard.writeText(text);
  }

  render() {
    const settings = settingsStore.data;
    const { className, contentClassName, ...dialogProps } = this.props;

    return (
      <Dialog
        {...dialogProps}
        className={cssNames(style.DonationDialog, className)}
        contentClassName={cssNames(style.content, contentClassName)}
      >
        <p>{getMessage("donate_description")}</p>
        <p>
          <b>BTC</b>: {this.#btcWallet}<br/>
          <Icon
            material="content_copy"
            onClick={() => this.copyToBuffer(this.#btcWallet)}
            tooltip={getMessage("donate_copy_wallet")}
          />
          <em>(Bitcoin network)</em>
        </p>
        <p>
          <b>ETH</b>: {this.#ethWallet} <br/>
          <Icon
            material="content_copy"
            onClick={() => this.copyToBuffer(this.#ethWallet)}
            tooltip={getMessage("donate_copy_wallet")}
          />
          <em>(ERC20 network)</em>
        </p>
        <Checkbox
          label="Allow click-streaming data for generated user id"
          tooltip="We collect *ONLY* visited URLs for anonymous user"
          checked={settings.userDataCollect}
          onChange={v => settings.userDataCollect = v}
        />
      </Dialog>
    );
  }
}
