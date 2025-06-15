import AILanguagesList from "./open-ai.json"
import { ITranslationResult, ProviderCodeName, TranslateParams, Translator } from "./index";
import { createStorage } from "../storage";
import { translateTextAction } from "../background/open-ai.bgc";
import { settingsStore } from "../components/settings/settings.storage";

export class DeepSeekTranslator extends Translator {
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

    return translateTextAction({
      provider: this.name,
      model: settingsStore.data.deepSeekModel,
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

Translator.register(ProviderCodeName.DEEPSEEK, DeepSeekTranslator);
