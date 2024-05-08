import { createStorage } from "../../storage";

export const rateButtonClicked = createStorage<boolean>("rate_btn_click", {
  defaultValue: false,
});

export const rateLastTimestamp = createStorage<number>("rate_delay_last", {
  defaultValue: 0,
});
