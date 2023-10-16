// External state for global dialogs
import { observable } from "mobx";

export const dialogsState = observable({
  showImportExportDialog: false,
  showDonationDialog: false,
  showPrivacyDialog: false,
});
