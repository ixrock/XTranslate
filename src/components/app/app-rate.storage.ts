import { createStorageHelper } from "../../extension/storage";

export const rateButtonClicked = createStorageHelper<boolean>("rate_btn_click", {
  autoSyncDelay: 0,
  defaultValue: false,
});

export const rateLastTimestamp = createStorageHelper<number>("rate_delay_last", {
  autoSyncDelay: 0,
  defaultValue: 0,
});
