import * as React from "react";
import { Props } from "./text-field";

export type Validator = ValidatorObject | ValidatorHandler;
export type ValidatorError = string | React.ReactNode;
export type ValidatorHandler = (value: string, props?: Props) => boolean;

export interface ValidatorObject {
  autoBind?: (props: Props) => boolean;
  message?: ((value: string, props?: Props) => ValidatorError) | ValidatorError
  validate: ValidatorHandler
}

export const Validators = {
  isRequired: {
    autoBind: ({ required }: Props) => required,
    message: "This field is required",
    validate: (value: string) => !!value.trim(),
  },

  isEmail: {
    autoBind: ({ type }: Props) => type === "email",
    message: "Wrong email format",
    validate: (value: string) => !!value.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/),
  },

  isNumber: {
    autoBind: ({ type }: Props) => type === "number",
    message: "Invalid number",
    validate: (value: string, { min, max }: Props) => {
      var numVal = +value;
      return !(
        isNaN(numVal) ||
        (min != null && numVal < min) ||
        (max != null && numVal > max)
      )
    },
  },

  minLength: {
    autoBind: ({ minLength }: Props) => !!minLength,
    message: (value, { minLength }: Props) => `Minimum length is ${minLength}`,
    validate: (value, { minLength }: Props) => value.length >= minLength,
  },

  maxLength: {
    autoBind: ({ maxLength }: Props) => !!maxLength,
    message: (value, { maxLength }: Props) => `Maximum length is ${maxLength}`,
    validate: (value, { maxLength }: Props) => value.length <= maxLength,
  },
};
