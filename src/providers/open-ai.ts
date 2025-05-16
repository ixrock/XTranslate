import LanguagesList from "./open-ai.json"
import { ITranslationResult, OpenAIModelTTS, ProviderCodeName, sanitizeApiKey, TranslateParams, Translator } from "./index";
import { getMessage } from "../i18n";
import { createStorage } from "../storage";
import { aiTextToSpeechAction, aiTranslateAction } from "../extension";
import { settingsStore } from "../components/settings/settings.storage";
import { toBinaryFile } from "../utils/binary";
import type { ProviderAuthSettingsProps } from "../components/settings/auth_settings";

class OpenAITranslator extends Translator {
  public name = ProviderCodeName.OPENAI;
  public title = "OpenAI";
  public publicUrl = "https://platform.openai.com/";
  public apiUrl = "https://api.openai.com/v1";

  constructor() {
    super(LanguagesList);
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
    await this.#apiKey.load();

    return aiTranslateAction({
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

    const data = await aiTextToSpeechAction({
      provider: this.name,
      model: OpenAIModelTTS.MINI,
      apiKey: this.#apiKey.get(),
      text,
      targetLanguage: lang,
    });

    return toBinaryFile(data, "audio/mpeg");
  }

  getAuthSettings(): ProviderAuthSettingsProps {
    return {
      apiKeySanitized: sanitizeApiKey(this.#apiKey.get()),
      setupApiKey: this.setupApiKey,
      clearApiKey: this.clearApiKey,
      accessInfo: getMessage("open_ai_get_access_info"),
      accessInfo2: getMessage("open_ai_insert_auth_key"),
      warningInfo: getMessage("open_ai_insert_auth_key_warning"),
      clearKeyInfo: getMessage("open_ai_insert_auth_key_remove"),
    };
  }
}

Translator.register(ProviderCodeName.OPENAI, OpenAITranslator);
