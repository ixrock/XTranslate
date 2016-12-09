require('./support.scss');
import * as React from 'react';
import { autobind } from "core-decorators";
import { __i18n } from "../../extension/i18n";
import { createStorage } from "../../utils";
import { connect } from "../../store/connect";
import { Dialog, Button } from '../ui'
import { ISettingsState, settingsActions } from "../settings";
export const adsDisabledTime = createStorage<number>('adsDisabledTime');

interface Props {
  settings?: ISettingsState
}

@connect(state => ({ settings: state.settings }))
export class Support extends React.Component<Props, {}> {
  private dialog: Dialog;
  private button: Button;

  componentWillMount() {
    this.updateTimer();
  }

  componentWillReceiveProps(nextProps: Props) {
    this.updateTimer(nextProps.settings.allowAds);
  }

  componentDidMount() {
    if (this.dialog.state.open) {
      setTimeout(this.button.focus, 100);
    }
  }

  updateTimer(allowAds = this.props.settings.allowAds, timer = Date.now(), forceUpdate = false) {
    if (!allowAds && (!+adsDisabledTime() || forceUpdate)) {
      adsDisabledTime(timer);
    }
  }

  @autobind()
  support() {
    settingsActions.sync({ allowAds: true });
    this.close();
  }

  @autobind()
  close() {
    var timeOffset = 1000 * 60 * 60 * 24 * 14; // forget about notification for 2 weeks
    this.updateTimer(false, Date.now() + timeOffset, true);
    this.dialog.close();
  }

  render() {
    var allowAds = this.props.settings.allowAds;
    var timeOffset = 1000 * 60 * 60 * 24 * 7; // first time check after one week
    var show = !allowAds && adsDisabledTime() + timeOffset < Date.now();
    return (
        <Dialog className="Support" open={show} pinned ref={e => this.dialog = e}>
          <p className="mb1">{__i18n("support_dialog_greeting")}</p>
          <b>{__i18n("support_dialog_line_1")}</b>
          <p className="mv1">
            {__i18n("support_dialog_line_2")}{" "}
            {__i18n("support_dialog_line_3")}{" "}
            {__i18n("support_dialog_line_4")}{" "}
            {__i18n("support_dialog_line_5")}{" "}
          </p>
          <p className="mb2">
            <b>{__i18n("support_dialog_thanks")}</b>
          </p>
          <div className="flex auto gaps">
            <Button label={__i18n("support_dialog_button_support")} primary onClick={this.support} ref={e => this.button = e}/>
            <Button label={__i18n("support_dialog_button_close")} accent onClick={this.close}/>
          </div>
        </Dialog>
    );
  }
}

export default Support;