// Mellowtel integration
// Read more: https://github.com/mellowtel-inc/mellowtel-js
import Mellowtel from "mellowtel";
import { createLogger } from "../src/utils/createLogger";
import { disposer } from "../src/utils";
import { MessageType, onMessage } from "../src/extension";

const logger = createLogger({ systemPrefix: "[MELLOWTEL]" });

export function listenMellowtelActions() {
  return disposer(
    onMessage(MessageType.MELLOWTEL_STATUS, mellowtelStatus),
    onMessage(MessageType.MELLOWTEL_ACTIVATE, mellowtelActivate),
    onMessage(MessageType.MELLOWTEL_DEACTIVATE, mellowtelDeactivate),
  );
}

export function mellowtelApi() {
  const apiKey = "d4286418";
  return new Mellowtel(apiKey);
}

export async function initBackground() {
  try {
    await mellowtelApi().initBackground();
  } catch (err) {
    logger.error(`init background failed: ${String(err)}`);
  }
}

export type InitContentPageParams = Parameters<
  InstanceType<typeof Mellowtel>["initContentScript"]
>[0];

export async function initContentPage(params: InitContentPageParams) {
  try {
    await mellowtelApi().initContentScript(params);
  } catch (err) {
    logger.error(`init content page script failed: ${String(err)}`, params);
  }
}

export async function mellowtelStatus() {
  return mellowtelApi().getOptInStatus();
}

export async function mellowtelActivate() {
  const api = mellowtelApi();
  const enabled = await mellowtelStatus();
  if (!enabled) {
    await api.optIn();
    await api.start();
    logger.info("Mellowtel activated");
  }
}

export async function mellowtelDeactivate() {
  const api = mellowtelApi();
  const enabled = await mellowtelStatus();
  if (enabled) {
    await api.stop();
    await api.optOut();
    logger.info("Mellowtel deactivated");
  }
}
