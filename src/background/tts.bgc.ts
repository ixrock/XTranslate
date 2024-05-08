//-- Handling "text-to-speech" abilities for extension

import { disposer } from "../utils";
import { ChromeTtsPayload, MessageType, onMessage } from '../extension'

export function listenTextToSpeechActions() {
  return disposer(
    onMessage(MessageType.CHROME_TTS_PLAY, ttsSpeak),
    onMessage(MessageType.CHROME_TTS_STOP, ttsStop),
  )
}

export function ttsSpeak(payload: ChromeTtsPayload) {
  const { text, lang, rate = 1.0 } = payload;
  chrome.tts.speak(text, { lang, rate, });
}

export function ttsStop() {
  chrome.tts.stop();
}
