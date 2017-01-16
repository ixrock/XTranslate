// Material design icons
// List of icons - from https://material.io/icons/

require('./material-icon.font.scss');
require('./material-icon.scss');

import * as React from 'react';
import { cssNames } from '../../../utils/cssNames';
import omit = require('lodash/omit');

interface Props extends React.HTMLProps<any> {
  name: string
}
export class MaterialIcon extends React.Component<Props, any> {
  render() {
    var props = omit(this.props, ['name']);
    var className = cssNames('material-icons', this.props.className, {
      button: this.props.href || this.props.onClick
    });
    return <i {...props} className={className}>{this.props.name}</i>
  }
}

export default MaterialIcon;