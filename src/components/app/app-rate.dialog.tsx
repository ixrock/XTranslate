import * as styles from "./app-rate.module.scss";
import React from "react";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { Dialog } from "../dialog";
import { Button } from "../button";
import { Icon } from "../icon";
import { getMessage } from "../../i18n";
import { getExtensionUrl } from "../../common-vars";
import { rateButtonClicked, rateLastTimestamp } from "./app-rate.storage";

@observer
export class AppRateDialog extends React.Component {
  @observable isOpen = false;

  constructor(props: object) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    await rateButtonClicked.load();
    await rateLastTimestamp.load();
    this.visibilityCheck();
  }

  visibilityCheck() {
    const isRated = rateButtonClicked.get();
    const delayLastTime = rateLastTimestamp.get();
    const delayDuration = 1000 * 60 * 60 * 24 * 30 * 2; // 2 months
    const isHidden = isRated || (delayLastTime + delayDuration > Date.now());
    this.isOpen = !isHidden;
  }

  rateApp = () => {
    window.open(getExtensionUrl());
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
      <Dialog
        pinned={true}
        isOpen={this.isOpen}
        className={styles.AppRateDialog}
        contentClassName="flex gaps column"
      >
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
