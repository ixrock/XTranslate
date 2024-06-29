import * as styles from './spinner.module.scss'
import React from 'react'
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
    var { center, singleColor, ...props } = this.props;
    var className = cssNames(styles.Spinner, this.props.className, {
      [styles.singleColor]: singleColor,
      [styles.center]: center,
    });
    return <div {...props} className={className} ref={e => this.elem = e}/>;
  }
}
