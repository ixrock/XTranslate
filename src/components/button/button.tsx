import styles from "./button.module.scss";
import React, { ButtonHTMLAttributes, ReactNode } from "react";
import { cssNames } from "../../utils";
import { TooltipDecoratorProps, withTooltip } from "../tooltip";

export interface ButtonProps extends ButtonHTMLAttributes<any>, TooltipDecoratorProps {
  label?: React.ReactNode;
  waiting?: boolean
  primary?: boolean
  accent?: boolean
  outline?: boolean
  hidden?: boolean
  active?: boolean
  big?: boolean
  round?: boolean
  href?: string // render as hyperlink
  target?: string // in case of using @href
}

@withTooltip
export class Button extends React.PureComponent<ButtonProps, {}> {
  private link: HTMLAnchorElement;
  private button: HTMLButtonElement;

  render() {
    var { className, waiting, label, primary, accent, outline, hidden, active, big, round, tooltip, children, ...props } = this.props;
    var btnProps = props as Partial<ButtonProps>;
    if (hidden) return;

    btnProps.className = cssNames(styles.Button, className, {
      [styles.waiting]: waiting,
      [styles.primary]: primary,
      [styles.accent]: accent,
      [styles.outline]: outline,
      [styles.active]: active,
      [styles.big]: big,
      [styles.round]: round,
    });

    var btnContent: ReactNode = (
      <>
        {label}
        {children}
      </>
    );

    // render as link
    if (this.props.href) {
      return (
        <a {...btnProps} ref={e => this.link = e}>
          {btnContent}
        </a>
      )
    }

    // render as button
    return (
      <button type="button" {...btnProps} ref={e => this.button = e}>
        {btnContent}
      </button>
    )
  }
}
