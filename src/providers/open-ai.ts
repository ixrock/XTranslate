import LanguagesList from "./open-ai.json"
import { ITranslationResult, OpenAIModelTTS, ProviderCodeName, TranslateParams, Translator } from "./index";
import { createStorage } from "../storage";
import { aiTextToSpeechAction, aiTranslateAction } from "../background/open-ai.bgc";
import { settingsStore } from "../components/settings/settings.storage";
import { toBinaryFile } from "../utils/binary";

class OpenAITranslator extends Translator {
  public name = ProviderCodeName.OPENAI;
  public title = "OpenAI";
  public publicUrl = "https://platform.openai.com/";
  public apiUrl = "https://api.openai.com/v1";
  #apiKey = createStorage<string>("openai_api_key");

  constructor() {
    super(LanguagesList);
  }

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

  private setupApiKey = () => {
    const newKey = window.prompt("OpenAI API Key");
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

Translator.register(ProviderCodeName.OPENAI, OpenAITranslator);
