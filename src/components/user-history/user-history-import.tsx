import "./user-history-import.scss";

import React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { Dialog, DialogProps } from "../dialog";
import { cssNames } from "../../utils";
import { AceEditor } from "../ace-editor";
import { Button } from "../button";
import { IHistoryStorageItem, userHistoryStore } from "./user-history.store";
import { Notifications } from "../notifications";
import { __i18n } from "../../extension";

// todo: add import from file button (?)
// todo: support drag-and-drop at ace-editor area (?)
// fixme: initial @observable static UserHistoryImport.isOpen=true doesn't work

interface Props extends DialogProps {
}

@observer
export class UserHistoryImport extends React.Component<Props> {
  @observable static isOpen = false;

  @observable validationError = ""
  @observable historyJson = "";
  @observable historyItems: IHistoryStorageItem[] = [];

  static show() {
    UserHistoryImport.isOpen = true;
  }

  static hide() {
    UserHistoryImport.isOpen = false;
  }

  validate = () => {
    var { historyJson } = this;
    try {
      this.validationError = ""
      var data = JSON.parse(historyJson);
      if (!Array.isArray(data) || !data.length) {
        throw new Error(__i18n("history_import_list_error"))
      }
      this.historyItems = data;
    } catch (err) {
      this.validationError = err;
      throw this.validationError;
    }
  }

  done = (itemsCount: number) => {
    this.historyJson = ""
    this.historyItems = [];
    Notifications.ok(__i18n("history_import_success", itemsCount));
    setTimeout(() => UserHistoryImport.hide(), 250); // close with delay to avoid ace-editor async errors
  }

  importHistory = async () => {
    try {
      this.validate();
      var { historyItems } = this;
      var count = await userHistoryStore.importItems(historyItems);
      this.done(count);
    } catch (err) {
      Notifications.error(String(err))
    }
  }

  render() {
    var { className, isOpen, ...dialogProps } = this.props;
    var { historyJson, importHistory } = this;
    return (
      <Dialog
        {...dialogProps}
        pinned={true}
        className={cssNames("UserHistoryImport", className)}
        isOpen={UserHistoryImport.isOpen}
        open={UserHistoryImport.show}
        close={UserHistoryImport.hide}
      >
        <h4 className="title">
          {__i18n("history_import_header")}
        </h4>
        <AceEditor
          autoFocus
          mode="json"
          value={historyJson}
          onChange={v => this.historyJson = v}
        />
        <div className="buttons flex gaps align-center justify-center">
          <Button
            outline
            label={__i18n("history_import_cancel")}
            onClick={() => UserHistoryImport.hide()}
          />
          <Button
            primary
            label={__i18n("history_import_button")}
            onClick={importHistory}
          />
        </div>
      </Dialog>
    );
  }
}
