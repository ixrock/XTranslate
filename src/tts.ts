// Text-to-speech

export interface TTSVoice extends SpeechSynthesisVoice {
}

export function speak(text: string, voice?: TTSVoice) {
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) {
    utterance.voice = voice;
  }

  speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  speechSynthesis.pause();
  speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
}

export async function getTTSVoices(): Promise<TTSVoice[]> {
  return new Promise((resolve) => {
    // for some reason `speechSynthesis.getVoices()` not available immediately
    const voices = speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
    } else {
      speechSynthesis.onvoiceschanged = () => {
        resolve(speechSynthesis.getVoices());
      };
    }
  });
}
