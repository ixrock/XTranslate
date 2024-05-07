import { createStorageHelper } from "../../storage";

export const rateButtonClicked = createStorageHelper<boolean>("rate_btn_click", {
  defaultValue: false,
});

export const rateLastTimestamp = createStorageHelper<number>("rate_delay_last", {
  defaultValue: 0,
});
