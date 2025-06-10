// Mellowtel integration
// Read more: https://github.com/mellowtel-inc/mellowtel-js
import Mellowtel from "mellowtel";
import { createIsomorphicAction, MessageType } from "../src/extension";
import { createLogger } from "../src/utils/createLogger";

const logger = createLogger({ systemPrefix: "[MELLOWTEL]" });

export const mellowtelActivateAction = createIsomorphicAction({
  messageType: MessageType.MELLOWTEL_ACTIVATE,
  handler: mellowtelActivate,
});

export const mellowtelDeactivateAction = createIsomorphicAction({
  messageType: MessageType.MELLOWTEL_DEACTIVATE,
  handler: mellowtelDeactivate,
});

export const mellowtelStatusAction = createIsomorphicAction({
  messageType: MessageType.MELLOWTEL_STATUS,
  handler: mellowtelStatus,
});

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
  try {
    const api = mellowtelApi();
    const enabled = await mellowtelStatus();
    if (!enabled) {
      await api.optIn();
      await api.start();
      logger.info("Mellowtel activated");
    }
  } catch (err) {
    logger.info(`Mellowtel activatation failed: ${err}`);
  }
}

export async function mellowtelDeactivate() {
  try {
    const api = mellowtelApi();
    const enabled = await mellowtelStatus();
    if (enabled) {
      await api.stop();
      await api.optOut();
      logger.info("Mellowtel deactivated");
    }
  } catch (err) {
    logger.info(`Mellowtel deactivation failed: ${err}`);
  }
}
