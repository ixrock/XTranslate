// Mellowtel integration
// Read more: https://github.com/mellowtel-inc/mellowtel-js
import Mellowtel from "mellowtel";
import { createLogger } from "../src/utils/createLogger";
import { createStorage } from "../src/storage";
import { dialogsState } from "../src/components/app/dialogs-state";

const logger = createLogger({ systemPrefix: "[MELLOWTEL]" });

export const mellowtelOptOutTime = createStorage<number>("mellowtel_opt_out_timestamp", {
  defaultValue: 0,
});

export function getApi() {
  const apiKey = "d4286418";
  return new Mellowtel(apiKey);
}

export async function initBackground() {
  try {
    await getApi().initBackground();
  } catch (err) {
    logger.error(`init background failed: ${String(err)}`);
  }
}

export async function initContentPage() {
  try {
    await getApi().initContentScript();
  } catch (err) {
    logger.error(`init content page script failed: ${String(err)}`);
  }
}

export async function mellowtelStatus() {
  const api = getApi();
  return {
    api: api,
    enabled: await api.getOptInStatus(),
  };
}

export async function checkDialogVisibility(): Promise<boolean> {
  await mellowtelOptOutTime.load();

  const lastOptOutTime = mellowtelOptOutTime.get();
  const { enabled } = await mellowtelStatus();
  const remindDuration = 1000 /*ms*/ * 3600 /*1h*/ * 24 /*1d*/ * 14; // every 2 weeks
  const trialActive = lastOptOutTime + remindDuration > Date.now();
  const isHidden = enabled || trialActive;

  return !isHidden;
}

// Actions for user-clicking confirmation

export async function mellowtelActivate() {
  const { enabled, api } = await mellowtelStatus();
  if (!enabled) {
    await api.optIn();
    await api.start();
    logger.info("Mellowtel activated");
  }
}

export async function mellowtelDeactivate() {
  const { enabled, api } = await mellowtelStatus();

  if (enabled) {
    await api.stop();
    await api.optOut();
    logger.info("Mellowtel deactivated");
  }
}

export async function resetDialogVisibility() {
  dialogsState.showMellowtelDialog = true;
  mellowtelOptOutTime.set(0);
}
