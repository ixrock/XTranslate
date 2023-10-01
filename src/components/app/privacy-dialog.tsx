import style from "./privacy-dialog.module.scss"
import React from "react";
import * as marked from "marked"
import { observer } from "mobx-react";
import { Dialog, DialogProps } from "../dialog";
import { cssNames } from "../../utils";
import privacyPolicyMd from "../../../privacy-policy.md"
import { Button } from "../button";
import { getMessage } from "../../i18n";

export interface PrivacyDialogProps extends DialogProps {
  onTermsAccepted?(): void;
}

@observer
export class PrivacyDialog extends React.Component<PrivacyDialogProps> {
  private dialog: Dialog;

  renderPolicyText() {
    return (
      <div className={style.policyContent} dangerouslySetInnerHTML={{
        __html: marked.parse(privacyPolicyMd),
      }}/>
    );
  }

  accept = () => {
    this.props.onTermsAccepted?.();
    this.dialog.close();
  }

  render() {
    const { className, contentClassName, ...dialogProps } = this.props;

    return (
      <Dialog
        pinned
        {...dialogProps}
        className={cssNames(style.PrivacyDialog, className)}
        contentClassName={cssNames(style.content, contentClassName)}
        ref={ref => this.dialog = ref}
      >
        <div className="flex column gaps">
          <h3>{getMessage("privacy_policy_title_updated")}</h3>
          {this.renderPolicyText()}
          <Button
            primary
            className="box center"
            label={getMessage("privacy_policy_accept_terms")}
            onClick={this.accept}
          />
        </div>
      </Dialog>
    );
  }
}
