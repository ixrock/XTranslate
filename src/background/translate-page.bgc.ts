import { createIsomorphicAction, MessageType, TranslateFullPagePayload } from "../extension";
import { ActiveTabPayload, sendActiveTabMessageWithRetry } from "./active-tab-request.bgc";

export interface TranslateActivePagePayload extends ActiveTabPayload, TranslateFullPagePayload {}

async function translateActivePageHandler({ tabId, ...payload }: TranslateActivePagePayload = {}) {
  return sendActiveTabMessageWithRetry<TranslateFullPagePayload, void>({
    tabId,
    message: {
      type: MessageType.TRANSLATE_FULL_PAGE,
      payload,
    },
  });
}

export const translateActivePageAction = createIsomorphicAction({
  messageType: MessageType.TRANSLATE_ACTIVE_PAGE,
  handler: translateActivePageHandler,
});
