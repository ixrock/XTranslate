import React from "react";
import OpenAILanguages from "./open-ai.json"
import { ITranslationResult, TranslateParams, Translator, VendorCodeName } from "./index";
import { getMessage } from "../i18n";
import { createStorage } from "../storage";
import { openAiTranslationAction } from "../extension";
import { VendorAuthSettings } from "../components/settings/vendor_auth_settings";
import { settingsStore } from "../components/settings/settings.storage";

// Read more about the prices: https://openai.com/api/pricing/
export const enum OpenAIModel {
  MOST_COST_EFFECTIVE = "gpt-4o-mini",
  RECOMMENDED = "gpt-4o",
  CHAT_GPT = "chatgpt-4o-latest",
  MOST_EXPENSIVE = "gpt-4", // we don't consider "gpt-4-32k" for this kind of tasks
}

class OpenAITranslator extends Translator {
  public name = VendorCodeName.OPENAI;
  public title = "OpenAI";
  public publicUrl = "https://platform.openai.com/";
  public apiUrl = "https://api.openai.com/v1";

  constructor() {
    super(OpenAILanguages);
  }

  #apiKey = createStorage("openai_api_key", {
    defaultValue: "", // register at https://platform.openai.com/ and get own access api-key + top-up balance (5-10$)
  });

  private setupApiKey = () => {
    const newKey = window.prompt("OpenAI API Key");
    if (newKey === null) return;
    this.#apiKey.set(newKey || this.#apiKey.defaultValue);
  };

  private clearApiKey = () => {
    this.#apiKey.set("");
  };

  async translate({ from, to, text }: TranslateParams): Promise<ITranslationResult> {
    return openAiTranslationAction({
      text,
      model: settingsStore.data.openAiModel,
      apiKey: this.#apiKey.get(),
      targetLanguage: this.langTo[to],
      sourceLanguage: from !== "auto" ? this.langFrom[from] : undefined,
    })
  }

  renderSettingsWidget(content?: React.ReactNode): React.ReactNode {
    return (
      <VendorAuthSettings
        className="openi-ai-settings"
        apiKey={this.#apiKey}
        setupApiKey={this.setupApiKey}
        clearApiKey={this.clearApiKey}
        accessInfo={getMessage("open_ai_get_access_info")}
        accessInfo2={getMessage("open_ai_insert_auth_key")}
        warningInfo={getMessage("open_ai_insert_auth_key_warning")}
        clearKeyInfo={getMessage("open_ai_insert_auth_key_remove")}
        children={content}
      />
    )
  }
}

Translator.registerVendor(OpenAITranslator);
