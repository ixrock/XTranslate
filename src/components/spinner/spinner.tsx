import './spinner.scss'

import * as React from 'react'
import { cssNames } from "../../utils";

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

  render() {
    var { className, center, singleColor, ...props } = this.props;
    var className = cssNames('Spinner', className, {
      singleColor: singleColor,
      center: center,
    });
    return <div {...props} className={className} ref={e => this.elem = e}/>;
  }
}
