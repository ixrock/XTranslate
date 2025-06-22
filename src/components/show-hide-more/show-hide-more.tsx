import * as styles from "./show-hide-more.module.scss"
import React from "react";
import { cssNames } from "@/utils";
import { Icon } from "../icon";
import { getMessage } from "@/i18n";

export interface ShowHideMoreProps extends React.PropsWithChildren {
  className?: string;
  label?: React.ReactNode;
  visible: boolean;
  onToggle(visible: boolean, evt: React.MouseEvent): void;
}

export function ShowHideMore({ className, visible, children, label, onToggle }: ShowHideMoreProps) {
  return (
    <>
      {visible && children}

      <div className={cssNames(styles.ExpandBlock, className)} onClick={(evt) => onToggle(!visible, evt)}>
        <Icon material={visible ? "expand_less" : "expand_more"}/>
        <span>
          {!visible && (label ?? getMessage("settings_show_more"))}
          {visible && (label ?? getMessage("settings_show_less"))}
        </span>
      </div>
    </>
  )
}
