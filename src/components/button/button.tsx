import "./button.scss";
import * as React from "react";
import { cssNames } from "../../utils";

export interface ButtonProps extends React.HTMLProps<any> {
  href?: string
  label?: string
  waiting?: boolean
  primary?: boolean
  accent?: boolean
  plain?: boolean
  hidden?: boolean
  active?: boolean
  big?: boolean
  round?: boolean
}

export class Button extends React.PureComponent<ButtonProps> {
  private link: HTMLAnchorElement;
  private button: HTMLButtonElement;

  render() {
    var { className, waiting, label, primary, accent, plain, hidden, active, big, round, children, ...props } = this.props;
    var btnProps = props as Partial<ButtonProps>;
    if (hidden) return null;

    btnProps.className = cssNames('Button', className, {
      waiting, primary, accent, plain, active, big, round,
    });

    var content = label && children
      ? React.Children.toArray([label, children])
      : label || children;

    // render as link
    if (this.props.href) {
      return (
        <a {...btnProps} ref={e => this.link = e}>
          {content}
        </a>
      )
    }

    // render as button
    return (
      <button type="button" {...btnProps} ref={e => this.button = e}>
        {content}
      </button>
    )
  }
}
