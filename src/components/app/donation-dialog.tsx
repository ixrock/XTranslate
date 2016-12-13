require('./donation-dialog.scss');
import * as React from 'react';
import * as Clipboard from "clipboard";
import { MaterialIcon } from "../ui/icons/material-icon";
import { Dialog } from "../ui";

export class DonationDialog extends React.Component<{}, {}> {
  private dialog: Dialog;
  private clipboard: Clipboard;
  private wallets = {
    WebMoney: [
      "Z912122863754",
      "R136684468106",
      "X660329307361",
    ],
    BTC: [
      "1GtHaXXjg81e2kHCWs38jFQ3YRtqaU8Q1y"
    ],
    PayPal: [
      "ixrock@gmail.com"
    ]
  };

  open() {
    this.dialog.open();
  }

  componentDidMount() {
    this.clipboard = new Clipboard('.icon-copy');
    this.clipboard.on("success", function (e) {
      var icon = e.trigger;
      var readyClassName = "copied";
      icon.classList.add(readyClassName);
      setTimeout(() => icon.classList.remove(readyClassName), 2500);
      e.clearSelection();
    });
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  render() {
    return (
        <Dialog className="DonationDialog" ref={e => this.dialog = e}>
          {Object.keys(this.wallets).map(title => {
            var wallets: string[] = this.wallets[title];
            return (
                <div key={title} className="donation-addr">
                  <div className="title">{title}</div>
                  {wallets.map((wallet, i) => {
                    var id = "wallet-" + [title, i + 1].join("-");
                    return (
                        <div key={wallet} className="wallet">
                          <span id={id}>{wallet}</span>
                          <MaterialIcon
                              name="content_copy" className="icon-copy button"
                              data-clipboard-target={"#"+ id}/>
                          <MaterialIcon name="done" className="icon-done"/>
                        </div>
                    )
                  })}
                </div>
            )
          })}
        </Dialog>
    );
  }
}