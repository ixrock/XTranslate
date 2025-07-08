import * as styles from "./mellowtel-dialog.module.scss";
import React from "react";
import { observer } from "mobx-react";
import { Dialog, DialogProps } from "@/components/dialog";
import { action, makeObservable } from "mobx";
import { getMessage } from "@/i18n";
import { Button } from "@/components/button";
import { mellowtelDialogVisibility, mellowtelInvitePageUrl, mellowtelOptOutTime, mellowtelStatusAction, mellowtelSupportPageUrl } from "./index";

export interface MellowtelDialogProps extends Omit<DialogProps, "isOpen"> {
}

@observer
export class MellowtelDialog extends React.Component<MellowtelDialogProps> {
  constructor(props: MellowtelDialogProps) {
    super(props);
    makeObservable(this);
  }

  async componentDidMount() {
    const { enabled } = await mellowtelStatusAction();
    mellowtelDialogVisibility.set(!enabled);
  }

  support = () => {
    window.open(mellowtelInvitePageUrl, "_blank");
    this.close();
  };

  close = action(() => {
    mellowtelDialogVisibility.set(false);
    mellowtelOptOutTime.set(Date.now());
  });

  render() {
    return (
      <Dialog
        pinned
        isOpen={mellowtelDialogVisibility.get()}
        className={styles.MellowtelDialog}
        contentClassName={`${styles.content} flex column gaps`}
      >
        <h4>{getMessage("mellowtel_greetings")}</h4>
        <p>{getMessage("mellowtel_text1")}</p>
        <ul className="flex column gaps">
          <li>
            {getMessage("mellowtel_text2", {
              link: <a href={mellowtelSupportPageUrl} target="_blank">Mellowtel</a>
            })}
          </li>
          <li>{getMessage("mellowtel_text3")}</li>
          <li>{getMessage("mellowtel_text4")}</li>
        </ul>

        <div className="buttons flex gaps justify-center">
          <Button outline onClick={this.close}>{getMessage("mellowtel_decline")}</Button>
          <Button autoFocus primary onClick={this.support}>
            {getMessage("mellowtel_install")}
          </Button>
        </div>

        <div>
          {getMessage("mellowtel_footer", {
            devs: <em key="devs">XTranslate & Mellowtel</em>
          })}
        </div>
      </Dialog>
    );
  }
}