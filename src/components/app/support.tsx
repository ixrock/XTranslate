import "./support.scss";
import * as React from "react";
import { autobind, debounce } from "core-decorators";
import { __i18n, broadcastMessage, MessageType, openOptionsPage } from "../../extension";
import { buyApp, checkLicense, checkPrice } from "../../extension/license";
import { noop } from "../../utils";
import { connect } from "../../store/connect";
import { Button, Dialog } from "../ui";
import { ISettingsState, settingsActions } from "../settings";

interface Props {
  settings?: ISettingsState
}

interface State {
  price?: string
  showDialog?: boolean,
  hasLicense?: boolean
}

@connect(state => ({ settings: state.settings }))
export class Support extends React.Component<Props, State> {
  private dialog: Dialog;
  public state: State = {};

  componentWillMount() {
    this.checkLicense();
    var buyAction = location.hash === "#buy";
    if (buyAction) {
      this.buyApp();
      history.replaceState({}, "", location.pathname);
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    var oldValue = this.props.settings.allowAds;
    var allowAds = nextProps.settings.allowAds;
    if (oldValue !== allowAds) {
      this.checkLicense(allowAds).then(this.broadcastLicense);
    }
  }

  @autobind()
  @debounce(100)
  broadcastLicense(hasLicense) {
    broadcastMessage({
      type: MessageType.LICENSE_STATE,
      payload: hasLicense
    });
  }

  async checkLicense(allowAds = this.props.settings.allowAds) {
    var state = Object.assign({}, this.state);
    await checkLicense(allowAds)
      .then(() => {
        state.hasLicense = true;
        state.showDialog = false;
      })
      .catch(() => {
        state.hasLicense = false;
        state.showDialog = true;
      });
    if (!state.hasLicense) {
      await checkPrice()
        .then(price => state.price = price)
        .catch(noop);
    }
    this.setState(state);
    return state.hasLicense;
  }

  @autobind()
  allowAds() {
    settingsActions.sync({ allowAds: true });
    this.dialog.close();
  }

  @autobind()
  buyApp() {
    var browserAction = location.hash === "#popup";
    if (!browserAction) {
      buyApp().then(() => {
        this.broadcastLicense(true);
        this.setState({ hasLicense: true });
        this.dialog.close();
      });
    } else {
      openOptionsPage("#buy");
    }
  }

  render() {
    var { showDialog, hasLicense } = this.state;
    var open = showDialog && !hasLicense;
    return (
      <Dialog className="Support" open={open} pinned ref={e => this.dialog = e}>
        <p className="sub-title">{__i18n("trial_is_over")}</p>
        <p className="mb1">{__i18n("trial_continue_options")}</p>
        <div className="mv1">
          <p>{__i18n("trial_option_allow_ads")}</p>
          <p>{__i18n("trial_option_buy_app", [this.state.price]).join("")}</p>
        </div>
        <div className="flex auto gaps">
          <Button label={__i18n("trial_button_allow_ads")} onClick={this.allowAds} accent autoFocus/>
          <Button label={__i18n("trial_button_buy_app")} onClick={this.buyApp} primary/>
        </div>
      </Dialog>
    );
  }
}
