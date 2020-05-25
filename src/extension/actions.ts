// Background page actions
import { onMessage, sendMessage } from "./runtime";
import { MessageType, PlayTextToSpeechPayload, TranslatePayload, TranslatePayloadResult } from "./messages";
import { isTranslation, ITranslationResult } from "../vendors";

export async function translateText(payload: TranslatePayload): Promise<ITranslationResult> {
  var msgId = Number(Date.now() * Math.random()).toString(16);
  sendMessage<TranslatePayload>({
    id: msgId,
    type: MessageType.TRANSLATE_TEXT,
    payload: payload,
  });
  return new Promise((resolve, reject) => {
    var stopListen = onMessage(({ type, payload, id }) => {
      if (type === MessageType.TRANSLATE_TEXT) {
        if (msgId === id) {
          stopListen();
          var { data, error } = payload as TranslatePayloadResult;
          if (data) resolve(data);
          else reject(error);
        }
      }
    });
  });
}

export function ttsPlay(payload: PlayTextToSpeechPayload | ITranslationResult) {
  if (isTranslation(payload)) {
    var { langFrom, langDetected = langFrom, originalText, vendor } = payload;
    payload = {
      vendor: vendor,
      lang: langDetected,
      text: originalText
    }
  }
  sendMessage<PlayTextToSpeechPayload>({
    type: MessageType.PLAY_TEXT_TO_SPEECH,
    payload: payload,
  });
}

export function ttsStop() {
  sendMessage({
    type: MessageType.STOP_TTS_PLAYING
  });
}
