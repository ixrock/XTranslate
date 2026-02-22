import { getActiveTabId, isRuntimeConnectionFailedError, Message, sendMessage, sendMessageSafe } from "../extension";
import { tryInjectContentScript } from "./scripting.bgc";

export interface ActiveTabPayload {
  tabId?: number;
}

interface SendActiveTabMessageWithRetryParams<Payload extends {} | [], Response> extends ActiveTabPayload {
  message: Omit<Message<Payload>, "tabId">;
  fallbackResponse?: Response;
}

export async function sendActiveTabMessageWithRetry<Payload extends {} | [], Response = unknown>({
  tabId,
  message,
  fallbackResponse,
}: SendActiveTabMessageWithRetryParams<Payload, Response>): Promise<Response> {
  const targetTabId = tabId ?? await getActiveTabId();
  const messageWithTab = {
    ...message,
    tabId: targetTabId,
  };

  try {
    const response = await sendMessage<Payload, Response>(messageWithTab);
    return (response ?? fallbackResponse) as Response;
  } catch (err) {
    if (!isRuntimeConnectionFailedError(err)) throw err;
  }

  await tryInjectContentScript({ tabId: targetTabId });

  const response = await sendMessageSafe<Payload, Response>(messageWithTab);
  return (response ?? fallbackResponse) as Response;
}
