import LanguagesList from "./open-ai.json"
import { ITranslationResult, sanitizeApiKey, TranslateParams, Translator, VendorCodeName } from "./index";
import { getMessage } from "../i18n";
import { createStorage } from "../storage";
import type { VendorAuthSettingsProps } from "../components/settings/vendor_auth_settings";
import { aiTranslateAction } from "../extension";

export const enum GrokAIModel {
  LATEST = "grok-2-latest",
}

class GrokTranslator extends Translator {
  public name = VendorCodeName.GROK;
  public title = "Grok";
  public publicUrl = "https://console.x.ai/";
  public apiUrl = "https://api.x.ai/v1";

  constructor() {
    super(LanguagesList);
  }

  #apiKey = createStorage("grok_x_api_key", {
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
      model: GrokAIModel.LATEST,
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
      accessInfo: getMessage("grok_ai_get_own_key_info"),
      accessInfo2: getMessage("grok_ai_auth_key"),
      warningInfo: getMessage("grok_ai_auth_key_warning"),
      clearKeyInfo: getMessage("grok_ai_auth_key_remove"),
    };
  }
}

Translator.registerVendor(GrokTranslator);
