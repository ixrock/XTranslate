import { createStorage } from "../src/storage";

export const mellowtelOptOutTime = createStorage<number>("mellowtel_opt_out_timestamp", {
  defaultValue: Date.now(),
  saveDefaultWhenEmpty: true,
});

export const mellowtelDialogVisibility = createStorage<boolean>("mellowtel_dialog_show", {
  defaultValue: false,
});
