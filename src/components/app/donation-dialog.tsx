import style from "./donation-dialog.module.scss"
import React from "react";
import { observer } from "mobx-react";
import { Dialog, DialogProps } from "../dialog";
import { getMessage } from "../../i18n";
import { cssNames } from "../../utils";
import { Icon } from "../icon";

@observer
export class DonationDialog extends React.Component<DialogProps> {
  #btcWallet = '1FuwS2M3JpwGRdZqh5kZZtcM36788xthu6';
  #ethWallet = '0x86ef84b008cf69fa5479e87f1ae82c5d1c47164b';
  #paypal = 'https://paypal.me/ixrock';

  render() {
    const { className, contentClassName, ...dialogProps } = this.props;

    return (
      <Dialog
        {...dialogProps}
        className={cssNames(style.DonationDialog, className)}
        contentClassName={cssNames(style.content, contentClassName)}
      >
        <p>{getMessage("donate_description")}</p>
        <p>
          <b>BTC</b>: {this.#btcWallet}{" "}
          <Icon material="content_copy" onClick={() => navigator.clipboard.writeText(this.#btcWallet)}/>
          <em>(Bitcoin network)</em>
        </p>
        <p>
          <b>ETH</b>: {this.#ethWallet}{" "}
          <Icon material="content_copy" onClick={() => navigator.clipboard.writeText(this.#ethWallet)}/>
          <em>(ERC20 network)</em>
        </p>
        <p>
          {getMessage("donate_via")} <a href={this.#paypal} target="_blank">PayPal</a>
        </p>
      </Dialog>
    );
  }
}
