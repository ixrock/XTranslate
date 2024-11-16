import React from 'react';
import { computed } from "mobx";
import { observer } from "mobx-react";
import { ReactSelect, ReactSelectOption } from "../select";
import { OpenAIModel } from "../../vendors/open-ai.vendor";
import { getMessage } from "../../i18n";
import { settingsStore } from "./settings.storage";

export interface OpenAiSelectModelProps {
}

@observer
export class OpenAiSelectModel extends React.Component<OpenAiSelectModelProps> {
  get modelsOptions(): ReactSelectOption<OpenAIModel>[] {
    return [
      {
        value: OpenAIModel.MOST_COST_EFFECTIVE,
        label: getMessage("open_ai_choose_model_cost_efficient"),
      },
      {
        value: OpenAIModel.RECOMMENDED,
        label: getMessage("open_ai_choose_model_optimal"),
      },
      {
        value: OpenAIModel.CHAT_GPT,
        label: getMessage("open_ai_choose_model_chatgpt_like"),
      },
      {
        value: OpenAIModel.MOST_EXPENSIVE,
        label: getMessage("open_ai_choose_model_best_results"),
      },
    ]
  }

  render() {
    const selectedOption = computed(() => this.modelsOptions.find(({ value }) => value === settingsStore.data.openAiModel))

    return (
      <small>
        <ReactSelect<OpenAIModel>
          placeholder={getMessage("open_ai_choose_model")}
          className="openai-select-model flex gaps align-center"
          value={selectedOption.get()}
          options={this.modelsOptions}
          formatOptionLabel={({ label, value }: ReactSelectOption<string>) => <>{label} (<em>{value}</em>)</>}
          onChange={({ value }) => settingsStore.data.openAiModel = value}
        />
      </small>
    )
  }
}
