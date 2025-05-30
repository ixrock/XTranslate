// Mellowtel actions
import { mellowtelActivate, mellowtelDeactivate, mellowtelStatus } from "./mellowtel.bgc";
import { isBackgroundWorker, MessageType, sendMessage } from "../src/extension";

export async function mellowtelStatusAction(): Promise<boolean> {
  if (isBackgroundWorker()) {
    return mellowtelStatus();
  }
  return sendMessage({
    type: MessageType.MELLOWTEL_STATUS,
  });
}

export async function mellowtelActivateAction() {
  if (isBackgroundWorker()) {
    return mellowtelActivate();
  }
  return sendMessage({
    type: MessageType.MELLOWTEL_ACTIVATE,
  });
}

export async function mellowtelDeactivateAction() {
  if (isBackgroundWorker()) {
    return mellowtelDeactivate();
  }
  return sendMessage({
    type: MessageType.MELLOWTEL_DEACTIVATE
  });
}
