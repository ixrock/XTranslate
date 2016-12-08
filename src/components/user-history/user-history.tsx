require('./user-history.scss');
import * as React from 'react';
import { MaterialIcon } from '../ui'
import { __i18n } from "../../extension/i18n";

export class UserHistory extends React.Component<{},{}> {
  render() {
    return (
        <div className="UserHistory">
          <div className="flex align-center justify-center">
            <MaterialIcon name="new_releases"/>
            <span className="soon">{__i18n("history_is_coming_soon")}</span>
          </div>
        </div>
    );
  }
}

export default UserHistory;