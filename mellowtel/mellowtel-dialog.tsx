import * as styles from "./mellowtel-dialog.module.scss";
import React from "react";
import { observer } from "mobx-react";
import { Dialog, DialogProps } from "../src/components/dialog";
import { action, makeObservable } from "mobx";
import { getMessage } from "../src/i18n";
import { Button } from "../src/components/button";
import { Icon } from "../src/components/icon";
import { dialogsState } from "../src/components/app";
import { mellowtelOptOutTime } from "./mellowtel.storage";
import { mellowtelActivateAction, mellowtelDeactivateAction, mellowtelStatusAction } from "./mellowtel.actions";

export interface MellowtelDialogProps extends Omit<DialogProps, "isOpen"> {
}

@observer
export class MellowtelDialog extends React.Component<MellowtelDialogProps> {
  constructor(props: MellowtelDialogProps) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    dialogsState.showMellowtelDialog = await this.checkDialogVisibility();
  }

  async checkDialogVisibility() {
    await mellowtelOptOutTime.load();
    let lastOptOutTime = mellowtelOptOutTime.get();

    if (!lastOptOutTime) {
      lastOptOutTime = Date.now();
      mellowtelOptOutTime.set(lastOptOutTime);
    }

    const enabled = await mellowtelStatusAction();
    const remindDuration = 1000 /*ms*/ * 3600 /*1h*/ * 24 /*1d*/ * 14; // every 2 weeks
    const trialActive = lastOptOutTime + remindDuration > Date.now();
    const isHidden = enabled || trialActive;

    return Boolean(!isHidden);
  }

  optIn = async () => {
    await mellowtelActivateAction();
    this.close();
  };

  optOut = async () => {
    await mellowtelDeactivateAction();
    this.close();
  };

  @action.bound
  close() {
    dialogsState.showMellowtelDialog = false;
    mellowtelOptOutTime.set(Date.now());
  }

  render() {
    return (
      <Dialog
        pinned
        isOpen={dialogsState.showMellowtelDialog}
        className={styles.MellowtelDialog}
        contentClassName="flex gaps column"
      >
        <h4>{getMessage("mellowtel_greetings")}</h4>
        <p>{getMessage("mellowtel_text1")}</p>
        <p>
          {getMessage("mellowtel_text2", {
            link: <a key="info" href="https://github.com/mellowtel-inc/mellowtel-js" target="_blank">Mellowtel</a>
          })}
        </p>

        <p>{getMessage("mellowtel_usage_title")}</p>
        <ul>
          <li>
            <Icon material="monitoring" small/>
            <span>{getMessage("mellowtel_usage1")}</span>
          </li>
          <li>
            <Icon material="equalizer" small/>
            <span>{getMessage("mellowtel_usage2")}</span>
          </li>
          <li>
            <Icon material="attach_money" small/>
            <span>{getMessage("mellowtel_usage3")}</span>
          </li>
        </ul>

        <div>{getMessage("mellowtel_accept_all_info1")}</div>
        <div>{getMessage("mellowtel_accept_all_info2")}</div>

        <ul>
          <li>{getMessage("mellowtel_regulation1")}</li>
          <li>{getMessage("mellowtel_regulation2")}</li>
          <li>{getMessage("mellowtel_regulation3")}</li>
        </ul>

        <div className="buttons flex gaps justify-center">
          <Button outline onClick={this.optOut}>{getMessage("mellowtel_button_decline")}</Button>
          <Button autoFocus primary onClick={this.optIn}>{getMessage("mellowtel_button_accept")}</Button>
        </div>

        <div>
          {getMessage("mellowtel_dialog_footer", {
            devs: <em key="devs">XTranslate & The Mellowtel</em>
          })}
        </div>
      </Dialog>
    );
  }
}