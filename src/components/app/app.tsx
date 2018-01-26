import './app.scss'
import * as React from 'react';
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { autobind } from 'core-decorators';
import { getStore } from '../../store'
import { connect } from "../../store/connect";
import { cssNames } from "../../utils/cssNames";
import { MaterialIcon, Spinner, Tab, Tabs } from '../ui'
import { __i18n, getManifest, getOptionsPageUrl } from "../../extension";
import { ISettingsState, Settings, settingsActions } from '../settings'
import { ThemeManager } from '../theme-manager'
import { InputTranslation } from '../input-translation'
import { UserHistory } from '../user-history'
import { Footer } from './footer'

enum TabId {
  settings,
  theme,
  popup,
  history,
}

interface Props {
  settings?: ISettingsState
}

@connect(state => ({ settings: state.settings }))
export class App extends React.Component<Props, {}> {
  public manifest = getManifest();

  componentWillMount() {
    document.title = this.manifest.name;
    this.setUpTheme();
    window.addEventListener("hashchange", () => this.forceUpdate());
  }

  componentWillReceiveProps(nextProps: Props) {
    this.setUpTheme(nextProps.settings);
  }

  componentDidMount() {
    loading.hide();
  }

  setUpTheme(settings = this.props.settings) {
    document.body.classList.toggle('theme-dark', settings.useDarkTheme);
  }

  @autobind()
  toggleDarkTheme() {
    var useDarkTheme = this.props.settings.useDarkTheme;
    settingsActions.sync({ useDarkTheme: !useDarkTheme });
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
    var activeTab = TabId[location.hash.replace("#", "")] || 0;
    var useDarkTheme = this.props.settings.useDarkTheme;
    return (
      <div className="App">
        <h4 className="page-title flex">
          <span className="box grow">{this.manifest.name} <sup>{this.manifest.version}</sup></span>
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

// show loading indicator while getting app state from the storage
var loading: Spinner;
render(
  <Spinner singleColor={false} ref={e => loading = e}/>,
  document.getElementById('loading')
);

// init app
getStore().then(store => {
  var appContainer = document.getElementById('app');
  render(<Provider store={store}><App/></Provider>, appContainer);
});