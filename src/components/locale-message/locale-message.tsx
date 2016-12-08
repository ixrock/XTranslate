require('./locale-message.scss');
import * as React from 'react';
import { __i18n, PlaceholderReplacer } from "../../extension/i18n";

interface Props {
  message: string;
  replacers?: PlaceholderReplacer[];
}

export class LocaleMessage extends React.Component<Props, {}> {
  render() {
    var { message, replacers } = this.props;
    return (
        <div className="LocaleMessage">
          {React.Children.toArray(__i18n(message, replacers))}
        </div>
    );
  }
}

export default LocaleMessage;