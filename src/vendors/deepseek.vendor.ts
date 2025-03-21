import LanguagesList from "./open-ai.json"
import { ITranslationResult, sanitizeApiKey, TranslateParams, Translator, VendorCodeName } from "./index";
import { getMessage } from "../i18n";
import { createStorage } from "../storage";
import { aiTranslateAction } from "../extension";
import type { VendorAuthSettingsProps } from "../components/settings/vendor_auth_settings";

export const enum DeepSeekAIModel {
  CHAT = "deepseek-chat",
  THINKER = "deepseek-reasoner"
}

class DeepSeekTranslator extends Translator {
  public name = VendorCodeName.DEEPSEEK;
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
    return aiTranslateAction({
      vendor: this.name,
      model: DeepSeekAIModel.CHAT,
      apiKey: this.#apiKey.get(),
      targetLanguage: this.langTo[to],
      sourceLanguage: from !== "auto" ? this.langFrom[from] : undefined,
      text,
    })
  }

  getAuthSettings(): VendorAuthSettingsProps {
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

Translator.registerVendor(DeepSeekTranslator);
