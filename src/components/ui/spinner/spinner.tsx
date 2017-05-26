require('./spinner.scss');
import * as React from 'react'
import { cssNames } from "../../../utils/cssNames";
import omit = require('lodash/omit');

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
    var props:Props = omit(this.props, ['singleColor', 'center']);
    var className = cssNames('Spinner', this.props.className, {
      singleColor: this.props.singleColor,
      center: this.props.center
    });
    return <div {...props} className={className} ref={e => this.elem = e}></div>;
  }
}
