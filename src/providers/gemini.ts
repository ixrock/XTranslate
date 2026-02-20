import AILanguagesList from "./open-ai.json"
import { ITranslationResult, ProviderCodeName, TranslateParams, Translator } from "./index";
import { createStorage } from "../storage";
import { translateTextWithAI } from "../background/ai.bgc";
import { settingsStore } from "../components/settings/settings.storage";

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

    return translateTextWithAI({
      provider: this.name,
      model: settingsStore.data.geminiModel,
      apiKey: this.#apiKey.get(),
      targetLanguage: this.langTo[to],
      sourceLanguage: from !== "auto" ? this.langFrom[from] : undefined,
      text,
    })
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
