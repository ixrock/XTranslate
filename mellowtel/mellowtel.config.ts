import { createStorage } from "@/storage";

export const mellowtelStatusUrl = `https://www.mellowtel.com/api/get-status?configuration_key=d4286418`;
export const mellowtelInvitePageUrl = `https://www.mellowtel.com/redirect?invite_id=qcix953yk8s`;
export const mellowtelSupportPageUrl = `https://www.mellowtel.com/support-with-mellowtel?invite_id=qcix953yk8s`;

export const mellowtelReminderDuration = 1000 * 3600 * 24 * 7; // 1w

export const mellowtelOptOutTime = createStorage<number>("mellowtel_opt_out_timestamp", {
  defaultValue: Date.now(),
  saveDefaultWhenEmpty: true,
});

export const mellowtelDialogVisibility = createStorage<boolean>("mellowtel_dialog_show", {
  defaultValue: false,
});
