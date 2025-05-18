import LanguagesList from "./open-ai.json"
import { DeepSeekAIModel, ITranslationResult, ProviderCodeName, sanitizeApiKey, TranslateParams, Translator } from "./index";
import { getMessage } from "../i18n";
import { createStorage } from "../storage";
import { aiTranslateAction } from "../background/open-ai.bgc";
import type { ProviderAuthSettingsProps } from "../components/settings/auth_settings";

class DeepSeekTranslator extends Translator {
  public name = ProviderCodeName.DEEPSEEK;
  public title = "DeepSeek";
  public publicUrl = "https://platform.deepseek.com/";
  public apiUrl = "https://api.deepseek.com";

  constructor() {
    super(LanguagesList);
  }

  #apiKey = createStorage("deepseek_api_key", {
    defaultValue: ""
  });

  private setupApiKey = () => {
    const newKey = window.prompt(`${this.title} API Key`);
    if (newKey === null) return;
    this.#apiKey.set(newKey || this.#apiKey.defaultValue);
  };

  private clearApiKey = () => {
    this.#apiKey.set("");
  };

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

  getAuthSettings(): ProviderAuthSettingsProps {
    return {
      apiKeySanitized: sanitizeApiKey(this.#apiKey.get()),
      setupApiKey: this.setupApiKey,
      clearApiKey: this.clearApiKey,
      accessInfo: getMessage("deepseek_get_own_key_info"),
      accessInfo2: getMessage("deepseek_auth_key"),
      warningInfo: getMessage("deepseek_auth_key_warning"),
      clearKeyInfo: getMessage("deepseek_auth_key_remove"),
    };
  }
}

Translator.register(ProviderCodeName.DEEPSEEK, DeepSeekTranslator);
