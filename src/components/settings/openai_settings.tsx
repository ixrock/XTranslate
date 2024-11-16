import * as styles from "./openai_settings.module.scss";
import React from 'react';
import { computed } from "mobx";
import { observer } from "mobx-react";
import { ReactSelect, ReactSelectOption } from "../select";
import { OpenAIModel } from "../../vendors/open-ai.vendor";
import { getMessage } from "../../i18n";
import { settingsStore } from "./settings.storage";
import { Icon } from "../icon";

export interface OpenAiSettingsModelProps {
}

@observer
export class OpenAiSettings extends React.Component<OpenAiSettingsModelProps> {
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
      <div className={styles.OpenAISettings}>
        <ReactSelect<OpenAIModel>
          placeholder={getMessage("open_ai_choose_model")}
          className={styles.selectModel}
          value={selectedOption.get()}
          options={this.modelsOptions}
          formatOptionLabel={({ label, value }: ReactSelectOption<string>) => <>{label} (<em>{value}</em>)</>}
          onChange={({ value }) => settingsStore.data.openAiModel = value}
        />
        <Icon small material="help_outline" tooltip={{
          children: getMessage("open_ai_why_info_help"),
          position: { right: true, bottom: true },
          following: false,
        }}/>
      </div>
    )
  }
}
