require('./app.scss');
import * as React from 'react';
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { autobind } from 'core-decorators';
import { getStore } from '../../store'
import { connect } from "../../store/connect";
import { Spinner, Tabs, Tab, MaterialIcon } from '../ui'
import { getURL, getManifest, __i18n } from "../../extension";
import { Settings, ISettingsState } from '../settings'
import { ThemeManager, loadFonts } from '../theme-manager'
import { InputTranslation } from '../input-translation'
import { UserHistory } from '../user-history'
import { Support } from './support'
import { Footer } from './footer'

interface Props {
  settings?: ISettingsState
}

@connect(state => ({ settings: state.settings }))
export class App extends React.Component<Props, {}> {
  public manifest = getManifest();

  componentWillMount() {
    document.title = this.manifest.name;
    this.setUpTheme();
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
  openInWindow() {
    chrome.windows.create({
      url: getURL(this.manifest.options_page),
      focused: true,
      width: 570,
      height: 635,
      type: "popup"
    });
  }

  render() {
    return (
        <div className="App">
          <h4 className="page-title flex">
            <span className="box grow">{this.manifest.name} <sup>{this.manifest.version}</sup></span>
            <MaterialIcon name="open_in_new" title={__i18n("open_in_window")} onClick={this.openInWindow}/>
          </h4>
          <Tabs>
            <Tab title={__i18n("tab_settings")}>
              <Settings/>
            </Tab>
            <Tab title={__i18n("tab_theme")}>
              <ThemeManager/>
            </Tab>
            <Tab title={__i18n("tab_text_input")} active>
              <InputTranslation/>
            </Tab>
            <Tab title={__i18n("tab_history")}>
              <UserHistory/>
            </Tab>
          </Tabs>
          <hr className="mb1"/>
          <Support/>
          <Footer/>
        </div>
    );
  }
}

// load base fonts for the page
loadFonts(['Lato', 'Roboto']);

// show loading indicator while getting app state from the storage
var loading: Spinner;
render(
    <Spinner singleColor={false} ref={e => loading = e}/>,
    document.getElementById('loading')
);

// init app when everything ready to start
var appContainer = document.getElementById('app');
getStore().then(store => {
  render(<Provider store={store}><App/></Provider>, appContainer);
});