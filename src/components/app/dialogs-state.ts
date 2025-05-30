// External state for global dialogs
import { observable } from "mobx";

export const dialogsState = observable.object({
  showImportExportDialog: false,
  showPrivacyDialog: false,
  showMellowtelDialog: false,
});
