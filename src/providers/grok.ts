import AILanguagesList from "./open-ai.json"
import { ITranslationResult, ProviderCodeName, TranslateParams, Translator } from "./index";
import { createStorage } from "../storage";
import { settingsStore } from "../components/settings/settings.storage";
import { translateTextAction } from "../background/ai.bgc";

export class GrokTranslator extends Translator {
  override name = ProviderCodeName.GROK;
  override title = "Grok";
  override publicUrl = "https://console.x.ai/";
  override apiUrl = "https://api.x.ai/v1";
  override isRequireApiKey = true;
  #apiKey = createStorage<string>("grok_x_api_key");

  constructor() {
    super({ languages: AILanguagesList });
  }

  async translate({ from, to, text }: TranslateParams): Promise<ITranslationResult> {
    await this.#apiKey.load();

    return translateTextAction({
      provider: this.name,
      model: settingsStore.data.grokAiModel,
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

Translator.register(ProviderCodeName.GROK, GrokTranslator);
