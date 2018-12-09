import './app.scss'
import * as React from 'react';
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { autobind } from 'core-decorators';
import { loadAppState, store } from '../../store/store'
import { connect } from "../../store/connect";
import { cssNames } from "../../utils/cssNames";
import { __i18n, getManifest, getOptionsPageUrl } from "../../extension";
import { ISettingsState, Settings, settingsActions } from '../settings'
import { ThemeManager } from '../theme-manager'
import { InputTranslation } from '../input-translation'
import { UserHistory } from '../user-history'
import { Footer } from '../footer'
import { Spinner } from "../spinner";
import { MaterialIcon } from "../icons";
import { Tab, Tabs } from "../tabs";

enum TabId {
  settings, theme, popup, history,
}

interface Props {
  settings?: ISettingsState
}

@connect(state => ({
  settings: state.settings
}))
export class App extends React.Component<Props> {
  static loading: Spinner;

  public manifest = getManifest();

  static async init() {
    // show waiting indicator while loading app state
    render(
      <Spinner singleColor={false} ref={e => App.loading = e}/>,
      document.getElementById('loading')
    );
    // load app state and render
    loadAppState().then(() => {
      render(
        <Provider store={store}>
          <App/>
        </Provider>,
        document.getElementById('app')
      );
    })
  }

  componentDidMount() {
    document.title = this.manifest.name;
    window.addEventListener("hashchange", () => this.forceUpdate());
    this.setUpTheme();
    App.loading.hide();
  }

  componentDidUpdate(prevProps: Props) {
    var { useDarkTheme } = this.props.settings;
    if (useDarkTheme !== prevProps.settings.useDarkTheme) {
      this.setUpTheme();
    }
  }

  setUpTheme() {
    var { useDarkTheme } = this.props.settings;
    document.body.classList.toggle('theme-dark', useDarkTheme);
  }

  @autobind()
  toggleDarkTheme() {
    settingsActions.sync({
      useDarkTheme: !this.props.settings.useDarkTheme
    });
  }

  @autobind()
  openInWindow() {
    chrome.windows.create({
      url: getOptionsPageUrl(),
      focused: true,
      width: 570,
      height: 650,
      type: "popup"
    });
  }

  render() {
    var { name, version } = this.manifest;
    var activeTab = TabId[location.hash.replace("#", "")] || 0;
    var useDarkTheme = this.props.settings.useDarkTheme;
    return (
      <div className="App">
        <h4 className="page-title flex">
          <span className="box grow">{name} <sup>{version}</sup></span>
          <img src={require('../icons/moon.svg')}
               className={cssNames("dark-theme-icon", { active: useDarkTheme })}
               title={__i18n("use_dark_theme")}
               onClick={this.toggleDarkTheme}/>
          <MaterialIcon
            name="open_in_new"
            title={__i18n("open_in_window")}
            onClick={this.openInWindow}/>
        </h4>
        <Tabs activeIndex={activeTab}>
          <Tab href={"#" + TabId[TabId.settings]} title={__i18n("tab_settings")}>
            <Settings/>
          </Tab>
          <Tab href={"#" + TabId[TabId.theme]} title={__i18n("tab_theme")}>
            <ThemeManager/>
          </Tab>
          <Tab href={"#" + TabId[TabId.popup]} title={__i18n("tab_text_input")}>
            <InputTranslation/>
          </Tab>
          <Tab href={"#" + TabId[TabId.history]} title={__i18n("tab_history")}>
            <UserHistory/>
          </Tab>
        </Tabs>
        <hr className="mb1"/>
        <Footer/>
      </div>
    );
  }
}

// init app, delayed call cause sometimes window might collapse on open
setTimeout(() => App.init())