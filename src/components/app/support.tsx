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
    var allowAds = this.props.settings.allowAds;
    if (!allowAds && (!+adsDisabledTime() || adsDisabledTime() > Date.now())) {
      adsDisabledTime(Date.now());
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    var allowAds = nextProps.settings.allowAds;
    adsDisabledTime(!allowAds ? Date.now() : null);
  }

  componentDidMount() {
    if (this.dialog.state.open) {
      setTimeout(this.button.focus, 100);
    }
  }

  @autobind()
  support() {
    settingsActions.sync({ allowAds: true });
    this.close();
  }

  @autobind()
  close() {
    adsDisabledTime(Date.now());
    this.dialog.close();
  }

  render() {
    var allowAds = this.props.settings.allowAds;
    var show = !allowAds && adsDisabledTime() + (1000 * 60 * 60 * 24 * 14) < Date.now(); // every 2 weeks
    return (
        <Dialog className="Support" open={show} pinned ref={e => this.dialog = e}>
          <p className="mb1">{__i18n("support_dialog_greeting")}</p>
          <b>{__i18n("support_dialog_line_1")}</b>
          <p className="mv1">
            {__i18n("support_dialog_line_2")}{" "}
            {__i18n("support_dialog_line_3")}{" "}
            {__i18n("support_dialog_line_4")}
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