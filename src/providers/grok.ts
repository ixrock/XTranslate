import AILanguagesList from "./open-ai.json"
import { ITranslationResult, ProviderCodeName, TranslateParams, Translator } from "./index";
import { createStorage } from "../storage";
import { settingsStore } from "../components/settings/settings.storage";
import { translateTextAction } from "../background/open-ai.bgc";

export class GrokTranslator extends Translator {
  override name = ProviderCodeName.GROK;
  override title = "Grok";
  override publicUrl = "https://console.x.ai/";
  override apiUrl = "https://api.x.ai/v1";
  override isRequireApiKey = true;
  #apiKey = createStorage<string>("grok_x_api_key");

  constructor() {
    super({languages: AILanguagesList});
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

  private setupApiKey = () => {
    const newKey = window.prompt(`${this.title} API Key`);
    if (newKey === null) return;
    this.#apiKey.set(newKey || this.#apiKey.defaultValue);
  };

  private clearApiKey = () => {
    this.#apiKey.set("");
  };

  getAuthSettings() {
    return {
      apiKeySanitized: this.sanitizeApiKey(this.#apiKey.get()),
      setupApiKey: this.setupApiKey,
      clearApiKey: this.clearApiKey,
    };
  }
}

Translator.register(ProviderCodeName.GROK, GrokTranslator);
