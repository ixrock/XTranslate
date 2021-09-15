import "./app-rate.dialog.scss";

import React from "react";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Icon } from "../icon";
import { createStorageHelper } from "../../extension/storage";
import { extensionUrl } from "../../common-vars";
import { getMessage } from "../../i18n";

export const rateButtonClicked = createStorageHelper<boolean>("rate_btn_click", {
  defaultValue: false,
});

export const rateLastTimestamp = createStorageHelper<number>("rate_delay_last", {
  defaultValue: 0,
});

@observer
export class AppRateDialog extends React.Component {
  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  @observable isOpen = false;

  ready = Promise.allSettled([
    rateButtonClicked.whenReady,
    rateLastTimestamp.whenReady,
  ]);

  async componentDidMount() {
    await this.ready;
    this.visibilityCheck();
  }

  visibilityCheck() {
    var isRated = rateButtonClicked.get();
    var delayLastTime = rateLastTimestamp.get();
    var delayDuration = 1000 * 60 * 60 * 24 * 30 * 3; // 3 months
    var isHidden = isRated || (delayLastTime + delayDuration > Date.now());
    this.isOpen = !isHidden;
  }

  rateApp = () => {
    window.open(extensionUrl);
    rateButtonClicked.set(true);
    this.close();
  }

  remindLater = () => {
    rateLastTimestamp.set(Date.now());
    this.close();
  }

  close() {
    this.isOpen = false;
  }

  render() {
    return (
      <Dialog pinned className="AppRateDialog" isOpen={this.isOpen}>
        <h4>{getMessage("rate_app_info1")}</h4>
        <p>{getMessage("rate_app_info2")}</p>

        <div className="buttons flex gaps justify-center">
          <Button autoFocus primary onClick={this.rateApp} className="flex align-center">
            <Icon small material="star_rate"/>
            <span>{getMessage("rate_app_button")}</span>
          </Button>
          <Button accent onClick={this.remindLater} className="flex align-center">
            <Icon small material="timer"/>
            <span>{getMessage("rate_app_button_later")}</span>
          </Button>
        </div>
      </Dialog>
    );
  }
}
