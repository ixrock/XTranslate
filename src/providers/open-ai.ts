import AILanguagesList from "./open-ai.json"
import { ITranslationResult, OpenAIModelTTS, ProviderCodeName, TranslateParams, Translator } from "./index";
import { createStorage } from "../storage";
import { textToSpeechAction, translateTextAction } from "../background/open-ai.bgc";
import { settingsStore } from "../components/settings/settings.storage";
import { toBinaryFile } from "../utils/binary";

export class OpenAITranslator extends Translator {
  override name = ProviderCodeName.OPENAI;
  override title = "OpenAI";
  override publicUrl = "https://platform.openai.com/";
  override apiUrl = "https://api.openai.com/v1";
  override isRequireApiKey = true;
  #apiKey = createStorage<string>("openai_api_key");

  constructor() {
    super({ languages: AILanguagesList });
  }

  async translate({ from, to, text }: TranslateParams): Promise<ITranslationResult> {
    await this.#apiKey.load();

    return translateTextAction({
      provider: this.name,
      model: settingsStore.data.openAiModel,
      apiKey: this.#apiKey.get(),
      targetLanguage: this.langTo[to],
      sourceLanguage: from !== "auto" ? this.langFrom[from] : undefined,
      text,
    })
  }

  async getAudioFile(text: string, lang?: string): Promise<Blob> {
    await this.#apiKey.load();

    const data = await textToSpeechAction({
      provider: this.name,
      model: OpenAIModelTTS.MINI,
      apiKey: this.#apiKey.get(),
      voice: settingsStore.data.openAiTtsVoice,
      text,
      targetLanguage: lang,
    });

    return toBinaryFile(data, "audio/mpeg");
  }

  getAuthSettings() {
    return {
      apiKeySanitized: this.sanitizeApiKey(this.#apiKey.get()),
      setupApiKey: () => this.setupApiKey(key => this.#apiKey.set(key)),
      clearApiKey: () => this.#apiKey.set(""),
    };
  }
}

Translator.register(ProviderCodeName.OPENAI, OpenAITranslator);
