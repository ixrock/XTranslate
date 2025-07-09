import * as styles from "./privacy-dialog.module.scss"

import React from "react";
import semver from "semver";
import * as marked from "marked"
import { observer } from "mobx-react";
import privacyPolicyMd from "@/../privacy-policy.md"
import { getManifest } from "@/extension";
import { createStorage } from "@/storage";
import { getMessage } from "@/i18n";
import { cssNames } from "@/utils";
import { Dialog, DialogProps } from "../dialog";
import { Button } from "../button";

const appVersion = getManifest().version;

export const privacyPolicyStorage = createStorage("privacy_policy", {
  area: "sync",
  autoLoad: true,
  saveDefaultWhenEmpty: true,
  defaultValue: {
    acceptedVersion: appVersion,
  }
});

export interface PrivacyDialogProps extends Partial<DialogProps> {
  affectedVersion?: string;
  onTermsAccepted?(): void;
}

@observer
export class PrivacyDialog extends React.Component<PrivacyDialogProps> {
  private dialog: Dialog;

  get isReady() {
    return privacyPolicyStorage.loaded;
  }

  get isOpen() {
    const { affectedVersion } = this.props;
    const { acceptedVersion } = privacyPolicyStorage.get();
    return semver.lt(acceptedVersion, affectedVersion);
  }

  onAccept = () => {
    privacyPolicyStorage.merge({ acceptedVersion: appVersion });
    this.props.onTermsAccepted?.();
    this.dialog.close();
  }

  render() {
    if (!this.isReady) return;
    const { className, contentClassName, ...dialogProps } = this.props;

    return (
      <Dialog
        pinned
        isOpen={this.isOpen}
        {...dialogProps}
        className={cssNames(styles.PrivacyDialog, className)}
        contentClassName={cssNames(styles.content, contentClassName)}
        ref={elem => {
          this.dialog = elem;
        }}
      >
        <h3>{getMessage("privacy_policy_title_updated")}</h3>
        <div
          className={styles.policyContent}
          dangerouslySetInnerHTML={{ __html: marked.parse(privacyPolicyMd) }}
        />
        <Button
          primary
          label={getMessage("privacy_policy_accept_terms")}
          onClick={this.onAccept}
        />
      </Dialog>
    );
  }
}
