import { createStorage } from "../src/storage";

export const mellowtelOptOutTime = createStorage<number>("mellowtel_opt_out_timestamp", {
  defaultValue: 0,
});

export const mellowtelDialogState = createStorage<boolean>("mellowtel_dialog_show", {
  defaultValue: false,
});
