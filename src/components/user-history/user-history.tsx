require('./user-history.scss');
import * as React from 'react';
import { connect } from "../../store/connect"
import { __i18n } from "../../extension/i18n"
import { cssNames, prevDefault } from "../../utils";
import { Checkbox, Button, Spinner, Select, Option, MaterialIcon } from '../ui'
import { ISettingsState, settingsActions } from "../settings";
import { getHistory, clearHistory } from "./user-history.actions";
import { ITranslationHistory } from "./user-history.types";
import groupBy = require("lodash/groupBy");

interface Props {
  settings?: ISettingsState
}

interface State {
  history?: ITranslationHistory[]
  loading?: boolean
  page?: number
  pageSize?: number
  hasMore?: boolean
  clearPeriod?: HistoryPeriod
  showDetails?: { [itemId: string]: boolean }
}

enum HistoryPeriod {
  HOUR, DAY, MONTH, YEAR, ALL
}

@connect(store => ({
  settings: store.settings
}))
export class UserHistory extends React.Component<Props,State> {
  public state: State = {
    history: [],
    page: 0,
    pageSize: 100,
    clearPeriod: HistoryPeriod.HOUR,
    showDetails: {},
  };

  async componentWillMount() {
    this.setState({ loading: true });
    await this.loadHistory();
    this.setState({ loading: false });
  }

  async loadHistory() {
    try {
      var { page, pageSize } = this.state;
      var history = await getHistory();
      var visibleHistory = this.state.history.concat(history.splice(page * pageSize, pageSize));
      this.setState({
        page: page + 1,
        hasMore: history.length > visibleHistory.length,
        history: visibleHistory,
      });
    } catch (e) {
    }
  }

  reloadHistory() {
    this.setState({ page: 0, history: [] }, () => {
      this.loadHistory();
    });
  }

  getPeriod(dateTime: string, period?: HistoryPeriod) {
    var d = new Date(dateTime).toISOString().split("T");
    var date = d[0].split('-');
    var time = d[1].split(':');
    if (period === HistoryPeriod.HOUR) date = date.concat(time[0]);
    if (period === HistoryPeriod.MONTH) date = date.slice(0, 2);
    if (period === HistoryPeriod.YEAR) date = date.slice(0, 1);
    return date.join("-");
  }

  async clearHistory() {
    var { history, clearPeriod } = this.state;
    if (!history.length) return;
    try {
      var datePeriod = this.getPeriod(history[0].date, clearPeriod);
      var clearAll = clearPeriod === HistoryPeriod.ALL;
      var clearFilter = (item: ITranslationHistory) => {
        return datePeriod === this.getPeriod(item.date, clearPeriod);
      };
      await clearHistory(clearAll ? null : clearFilter);
      this.reloadHistory();
    } catch (e) {
    }
  }

  removeItem(item: ITranslationHistory) {
    var history = this.state.history;
    var index = history.indexOf(item);
    clearHistory(index).then(() => {
      history.splice(index, 1);
      this.setState({ history });
    });
  }

  toggleDetails(itemId: string) {
    var showDetails = Object.assign({}, this.state.showDetails);
    showDetails[itemId] = !showDetails[itemId];
    this.setState({ showDetails });
  }

  renderHistory() {
    var { history, showDetails } = this.state;
    if (!history || !history.length) return null;
    var groupedHistory = groupBy(history, function (item) {
      return new Date(item.date).toDateString();
    });
    var historyDays = Object.keys(groupedHistory);
    return (
        <ul className="history">
          {historyDays.map(day => {
            return React.Children.toArray([
              <li className="history-date">{day}</li>,
              ...groupedHistory[day].map(item => {
                var itemId = item.id;
                var openDetails = showDetails[itemId];
                var translatedWith = __i18n("translated_with", [
                  item.vendor[0].toUpperCase() + item.vendor.substr(1),
                  [item.from, item.to].join(" → ").toUpperCase()
                ]).join("");
                return (
                    <li key={itemId} title={translatedWith}
                        className={cssNames("history-item", {open: openDetails})}
                        onClick={() => this.toggleDetails(itemId)}>
                      <div className="main-info flex gaps">
                      <span className="text box grow">
                        {item.text}
                        {item.ts ? <span className="transcription">({item.ts})</span> : null}
                      </span>
                        <span className="translation box grow">{item.tr}</span>
                        <MaterialIcon
                            name="remove_circle_outline" className="remove-icon"
                            onClick={prevDefault(() => this.removeItem(item))}
                        />
                      </div>
                      {openDetails ? this.renderDetails(item) : null}
                    </li>
                );
              })
            ]);
          })}
        </ul>
    );
  }

  renderDetails(item: ITranslationHistory) {
    var dict = item.dict;
    if (!dict.length) return null;
    return (
        <div className="details flex gaps auto">
          {dict.map(dict => {
            var wordType = dict.w;
            return (
                <div key={wordType} className="dictionary">
                  <b className="word-type">{wordType}</b>
                  <div className="translations">
                    {dict.tr.join(", ")}
                  </div>
                </div>
            )
          })}
        </div>
    );
  }

  render() {
    var { history, loading, clearPeriod, hasMore } = this.state;
    var saveHistory = this.props.settings.historyEnabled;
    return (
        <div className="UserHistory">
          <div className="flex gaps align-center justify-center">
            <Checkbox
                label={__i18n("history_enabled_flag")}
                checked={saveHistory}
                onChange={v => settingsActions.sync({historyEnabled: v})}
            />
            <Select value={clearPeriod} onChange={v => this.setState({clearPeriod: v})}>
              <Option value={HistoryPeriod.HOUR} title={__i18n("history_clear_period_hour")}/>
              <Option value={HistoryPeriod.DAY} title={__i18n("history_clear_period_day")}/>
              <Option value={HistoryPeriod.MONTH} title={__i18n("history_clear_period_month")}/>
              <Option value={HistoryPeriod.ALL} title={__i18n("history_clear_period_all")}/>
            </Select>
            <Button
                accent label={__i18n("history_button_clear")}
                onClick={() => this.clearHistory()}
            />
          </div>
          {loading && <div className="pt1"><Spinner center/></div>}
          {history && this.renderHistory()}
          {hasMore && (
              <div className="load-more flex center mt2">
                <Button
                    primary label={__i18n("history_button_show_more")}
                    onClick={() => this.loadHistory()}
                />
              </div>
          )}
        </div>
    );
  }
}

export default UserHistory;