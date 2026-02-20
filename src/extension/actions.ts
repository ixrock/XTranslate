import { isBackgroundWorker, onMessage, sendMessage } from "./runtime";
import { MessageType } from "./messages";

export interface IsomorphicActionParams<Payload extends any[], Result> {
  messageType: MessageType;
  handler: (...data: Payload) => Promise<Result>;
  autoBindListener?: boolean; // bind handler to `chrome.runtime.onMessage` for provided  `message.type` (default: true)
}

export function createIsomorphicAction<Payload extends any[], Result>(params: IsomorphicActionParams<Payload, Result>) {
  const {
    messageType, handler,
    autoBindListener = true,
  } = params;

  if (autoBindListener && isBackgroundWorker()) {
    onMessage(messageType, handler);
  }

  return async (...payload: Payload): Promise<Result> => {
    if (isBackgroundWorker()) {
      return handler(...payload);
    }
    return sendMessage<Payload, Result>({
      type: messageType,
      payload,
    });
  };
}
