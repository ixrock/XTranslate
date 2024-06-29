import * as styles from "./donation-dialog.module.scss"
import React from "react";
import { observer } from "mobx-react";
import { Dialog, DialogProps } from "../dialog";
import { getMessage } from "../../i18n";
import { cssNames } from "../../utils";
import { Icon } from "../icon";

@observer
export class DonationDialog extends React.Component<DialogProps> {
  #btcWallet = '1FuwS2M3JpwGRdZqh5kZZtcM36788xthu6';

  private copyToBuffer(text: string) {
    return navigator.clipboard.writeText(text);
  }

  render() {
    const { className, contentClassName, ...dialogProps } = this.props;

    return (
      <Dialog
        {...dialogProps}
        className={cssNames(styles.DonationDialog, className)}
      >
        <div className="content flex column gaps">
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
        </div>
      </Dialog>
    );
  }
}
