import React from "react";
import { observer } from "mobx-react";
import { ReactSelect, ReactSelectOption, FormatOptionLabelMeta } from "../select";
import { AIModelTranslationKey } from "@/providers";
import { getMessage } from "@/i18n";

export type AIModelMap = Record<string, string>;

export interface SelectAIModelProps<Models extends AIModelMap> {
  className?: string;
  modelOptions: Models; // e.g. `OpenAIModel`
  getValue: () => ValueOf<Models>;
  onChange(value: ValueOf<Models>): void;
}

@observer
export class SelectAIModel<Models extends AIModelMap> extends React.Component<SelectAIModelProps<Models>> {
  get modelOptions(): ReactSelectOption<ValueOf<Models>>[] {
    return Object.entries(this.props.modelOptions).map(([key, value]) => {
      const translationKey = key.toLowerCase() as AIModelTranslationKey;
      return {
        value: value as ValueOf<Models>,
        label: getMessage(`ai_choose_model_${translationKey}`)
      }
    });
  }

  get selectedOption() {
    return this.modelOptions.find(({ value }) => value === this.props.getValue());
  }

  formatOptionLabel = (opt: ReactSelectOption<string>, meta: FormatOptionLabelMeta<ReactSelectOption>) => {
    const { value, label } = opt;
    const isMenuOption = meta.context === "menu";
    const isValue = meta.context === "value";
    return (
      <>
        {isValue && value}
        {isMenuOption && (
          <span>{label} <em>({value})</em></span>
        )}
      </>
    )
  };

  render() {
    const { className } = this.props;
    return (
      <ReactSelect
        className={className}
        placeholder={getMessage("ai_choose_model")}
        value={this.selectedOption}
        options={this.modelOptions}
        formatOptionLabel={this.formatOptionLabel}
        onChange={({ value }) => this.props.onChange(value as ValueOf<Models>)}
      />
    )
  }
}
