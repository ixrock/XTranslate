import "./button.scss";
import * as React from "react";
import { cssNames } from "../../../utils";

interface Props extends React.HTMLProps<any> {
  href?: string
  label?: string
  waiting?: boolean
  primary?: boolean
  accent?: boolean
  plain?: boolean
  hidden?: boolean
}

export class Button extends React.Component<Props, {}> {
  private link: HTMLAnchorElement;
  private button: HTMLButtonElement;

  render() {
    var { className, waiting, label, primary, accent, plain, hidden, children, ...props } = this.props;
    if (hidden) return null;

    Object.assign(props, {
      className: cssNames('Button', {
          waiting,
          primary,
          accent,
          plain,
        }, className
      )
    })

    var content = label && children
      ? React.Children.toArray([label, children])
      : label || children;

    // render as link
    if (this.props.href) {
      return (
        <a {...props} ref={e => this.link = e}>
          {content}
        </a>
      )
    }

    // render as button
    return (
      <button type="button" {...props} ref={e => this.button = e}>
        {content}
      </button>
    )
  }
}
