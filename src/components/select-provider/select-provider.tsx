import * as styles from "./select-provider.module.scss"
import React from "react";
import { getTranslators, ProviderCodeName, Translator } from "../../providers";
import { FormatOptionLabelMeta, ReactSelect, ReactSelectOption, ReactSelectProps } from "../select/react-select";
import { cssNames } from "../../utils/cssNames";
import { Icon } from "../icon";

export interface SelectProviderProps extends Omit<ReactSelectProps<ProviderCodeName>, "value" | "onChange" | "options"> {
  className?: string;
  compactView?: boolean;
  value?: ProviderCodeName;
  onChange?(value: ProviderCodeName): void;
  filter?(provider: Translator): boolean;
}

export function SelectProvider({ compactView, filter, value: providerName, ...inputProps }: SelectProviderProps) {
  const providers = getTranslators();

  const options: ReactSelectOption<ProviderCodeName>[] = providers
    .filter(filter ?? (() => true))
    .map((translator) => ({
      label: translator.title,
      value: translator.name,
    }));

  function formatOptionLabel({ value: providerName, label }: ReactSelectOption<string>, meta: FormatOptionLabelMeta<ReactSelectOption>) {
    const isMenuOption = meta.context === "menu";
    const isValue = meta.context === "value";
    const icon = <Icon svg={providerName} small/>
    const renderingValue = <>{icon} {label}</>;
    return (
      <>
        {isValue && (compactView ? icon : renderingValue)}
        {isMenuOption && renderingValue}
      </>
    )
  }

  function onChange({ value }: ReactSelectOption<ProviderCodeName>) {
    inputProps?.onChange(value);
  }

  return (
    <ReactSelect
      {...inputProps}
      className={cssNames(styles.SelectProvider, inputProps.className)}
      options={options}
      value={options.find(opt => opt.value === providerName)}
      onChange={onChange}
      formatOptionLabel={formatOptionLabel}
    />
  )
}
