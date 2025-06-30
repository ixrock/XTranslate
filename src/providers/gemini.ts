import AILanguagesList from "./open-ai.json"
import { GeminiAIModelTTS, ITranslationResult, ProviderCodeName, TranslateParams, Translator } from "./index";
import { createStorage } from "../storage";
import { translateTextAction, ttsGeminiAction } from "../background/ai.bgc";
import { settingsStore } from "../components/settings/settings.storage";
import { toBinaryFile } from "../utils/binary";
import { AITextToSpeechPayload } from "@/extension";

export class GeminiTranslator extends Translator {
  override name = ProviderCodeName.GEMINI;
  override title = "Gemini";
  override publicUrl = "https://aistudio.google.com/";
  override apiUrl = "https://generativelanguage.googleapis.com/v1beta";
  override isRequireApiKey = true;
  #apiKey = createStorage<string>("gemini_api_key");

  constructor() {
    super({ languages: AILanguagesList });
  }

  async translate({ from, to, text }: TranslateParams): Promise<ITranslationResult> {
    await this.#apiKey.load();

    return translateTextAction({
      provider: this.name,
      model: settingsStore.data.geminiModel,
      apiKey: this.#apiKey.get(),
      targetLanguage: this.langTo[to],
      sourceLanguage: from !== "auto" ? this.langFrom[from] : undefined,
      text,
    })
  }

  async getAudioFile(text: string, lang?: string): Promise<Blob> {
    await this.#apiKey.load();

    const responseFormat: AITextToSpeechPayload["response_format"] = "mp3";

    const data = await ttsGeminiAction({
      provider: this.name,
      model: GeminiAIModelTTS.FLASH,
      apiKey: this.#apiKey.get(),
      voice: settingsStore.data.tts.geminiVoice,
      text,
      targetLanguage: lang,
      response_format: responseFormat,
    });

    return toBinaryFile(data, `audio/${responseFormat}`);
  }

  getAuthSettings() {
    return {
      apiKeySanitized: this.sanitizeApiKey(this.#apiKey.get()),
      setupApiKey: () => this.setupApiKey(key => this.#apiKey.set(key)),
      clearApiKey: () => this.#apiKey.set(""),
    };
  }
}

Translator.register(ProviderCodeName.GEMINI, GeminiTranslator);
