require('./button.scss');
import * as React from 'react'
import { autobind } from "core-decorators";
import { cssNames } from "../../../utils";
import omit = require('lodash/omit');

interface Props extends React.HTMLProps<any> {
  href?: string
  label?: string
  waiting?: boolean
  primary?: boolean
  accent?: boolean
  plain?: boolean
}

export class Button extends React.Component<Props, {}> {
  private link: HTMLAnchorElement;
  private button: HTMLButtonElement;

  @autobind()
  focus() {
    this.button.focus();
  }

  @autobind()
  blur() {
    this.button.blur();
  }

  render() {
    var label = this.props.label;
    var waiting = this.props.waiting;
    var props: Props = omit(this.props, ['waiting', 'label', 'primary', 'accent', 'plain']);
    props.className = cssNames('Button', this.props.className, {
      waiting: waiting,
      primary: this.props.primary,
      accent: this.props.accent,
      plain: this.props.plain,
    });
    var Component = props => {
      return this.props.href
          ? <a {...props} ref={e => this.link = e}/>
          : <button type="button" ref={e => this.button = e} {...props}/>;
    };
    return (
        <Component {...props}>
          {label ? <span className="label">{label}</span> : null}
          {this.props.children}
        </Component>
    );
  }
}
