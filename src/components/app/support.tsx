require('./support.scss');
import * as React from 'react';
import { autobind } from "core-decorators";
import { __i18n } from "../../extension/i18n";
import { createStorage } from "../../utils";
import { connect } from "../../store/connect";
import { Dialog, Button } from '../ui'
import { ISettingsState, settingsActions } from "../settings";
export const adsDisabledTime = createStorage<number>('adsDisabledTime');
export const installTime = createStorage<number>('installTime', Date.now(), true);
const trialPeriodTime = 1000 * 60 * 60 * 24 * 14;

interface Props {
  settings?: ISettingsState
}

@connect(state => ({ settings: state.settings }))
export class Support extends React.Component<Props, {}> {
  private dialog: Dialog;
  private button: Button;

  componentDidMount() {
    if (this.dialog.state.open) {
      setTimeout(this.button.focus, 100);
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    var oldVal = this.props.settings.allowAds;
    var allow = nextProps.settings.allowAds;
    if (oldVal !== allow) this.updateTimer(allow);
  }

  updateTimer(allow: boolean) {
    adsDisabledTime(allow ? Number.MAX_SAFE_INTEGER : Date.now());
  }

  @autobind()
  support() {
    settingsActions.sync({ allowAds: true });
    this.updateTimer(true);
    this.dialog.close();
  }

  @autobind()
  close() {
    this.updateTimer(false);
    this.dialog.close();
  }

  render() {
    var allowAds = this.props.settings.allowAds;
    var disabledTime = adsDisabledTime();
    var timeOffset = 1000 * 60 * 60 * 24 * 7;
    var show = !allowAds && (disabledTime ? disabledTime + trialPeriodTime : installTime() + timeOffset) < Date.now();
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
          <div className="flex auto gaps">
            <Button label={__i18n("support_dialog_button_support")} primary onClick={this.support} ref={e => this.button = e}/>
            <Button label={__i18n("support_dialog_button_close")} accent onClick={this.close}/>
          </div>
        </Dialog>
    );
  }
}

export default Support;