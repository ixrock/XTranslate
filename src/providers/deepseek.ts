import AILanguagesList from "./open-ai.json"
import { DeepSeekAIModel, ITranslationResult, ProviderCodeName, TranslateParams, Translator } from "./index";
import { createStorage } from "../storage";
import { aiTranslateAction } from "../background/open-ai.bgc";

class DeepSeekTranslator extends Translator {
  public name = ProviderCodeName.DEEPSEEK;
  public title = "DeepSeek";
  public publicUrl = "https://platform.deepseek.com/";
  public apiUrl = "https://api.deepseek.com";
  override isRequireApiKey = true;
  #apiKey = createStorage<string>("deepseek_api_key");

  constructor() {
    super({ languages: AILanguagesList });
  }

  async translate({ from, to, text }: TranslateParams): Promise<ITranslationResult> {
    await this.#apiKey.load();

    return aiTranslateAction({
      provider: this.name,
      model: DeepSeekAIModel.CHAT,
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

Translator.register(ProviderCodeName.DEEPSEEK, DeepSeekTranslator);
