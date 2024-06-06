// External state for global dialogs
import { observable } from "mobx";

export const dialogsState = observable.object({
  showImportExportDialog: false,
  showDonationDialog: false,
  showPrivacyDialog: false,
  showMellowtelDialog: false,
});
