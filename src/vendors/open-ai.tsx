import React from "react";
import OpenAILanguages from "./open-ai.json"
import { ITranslationResult, TranslateParams, Translator } from "./translator";
import { createStorage } from "../storage";
import { getMessage } from "../i18n";
import { Icon } from "../components/icon";
import { prevDefault } from "../utils";
import { openAiTranslationAction } from "../extension";

class OpenAITranslator extends Translator {
  public name = "openai";
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

  private clearApiKey() {
    this.#apiKey.set("");
  };

  async translate({ from, to, text }: TranslateParams): Promise<ITranslationResult> {
    return openAiTranslationAction({
      apiKey: this.#apiKey.get(),
      model: undefined, // TODO: allow to customize / take from settings-storage
      text,
      targetLanguage: this.langTo[to],
      sourceLanguage: from !== "auto" ? this.langFrom[from] : undefined,
    })
  }

  renderSettingsListWidget(): React.ReactNode {
    const apiKey = this.#apiKey.get();

    return (
      <div className="flex gaps align-center">
        {!apiKey && (
          <Icon
            small
            material="info_outline"
            tooltip={getMessage("open_ai_get_access_info")}
          />
        )}
        <a href="#" onClick={prevDefault(this.setupApiKey)}>
          <Icon
            small
            material="warning_amber"
            tooltip={getMessage("open_ai_insert_auth_key_warning")}
          />
          <small>
            {!apiKey && <em>{getMessage("open_ai_insert_auth_key")}</em>}
            {apiKey && <b>{apiKey.substring(0, 4)}-****-{apiKey.substring(apiKey.length - 4)}</b>}
          </small>
        </a>
        {apiKey && <Icon
          small
          material="clear"
          onClick={this.clearApiKey}
          tooltip={getMessage("open_ai_insert_auth_key_remove")}
        />}
      </div>
    );
  }
}

Translator.createInstances.push(
  () => Translator.registerInstance(new OpenAITranslator()),
);
