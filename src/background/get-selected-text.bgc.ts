import { createIsomorphicAction, MessageType, } from "../extension";
import { ActiveTabPayload, sendActiveTabMessageWithRetry } from "./active-tab-request.bgc";

export interface GetSelectedTextPayload extends ActiveTabPayload {}

async function getSelectedTextHandler({ tabId }: GetSelectedTextPayload = {}): Promise<string> {
  return sendActiveTabMessageWithRetry<[], string>({
    tabId,
    message: {
      type: MessageType.GET_SELECTED_TEXT,
    },
    fallbackResponse: "",
  });
}

export const getSelectedTextAction = createIsomorphicAction({
  messageType: MessageType.GET_SELECTED_TEXT_ACTIVE_PAGE,
  handler: getSelectedTextHandler,
});
