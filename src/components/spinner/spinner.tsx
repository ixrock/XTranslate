import "./spinner.scss";
import * as React from "react";
import { cssNames } from "../../utils/cssNames";

interface Props extends React.HTMLProps<any> {
  singleColor?: boolean
  center?: boolean
}

export class Spinner extends React.Component<Props, {}> {
  private elem: HTMLElement;

  static defaultProps = {
    singleColor: true,
    center: false,
  };

  show() {
    this.elem.hidden = false;
  }

  hide() {
    this.elem.hidden = true;
  }

  render() {
    var { className, singleColor, center, ...props } = this.props;
    className = cssNames('Spinner', { singleColor, center }, className);
    return <div {...props} className={className} ref={e => this.elem = e}/>;
  }
}
