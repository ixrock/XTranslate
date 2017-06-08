import * as React from "react";

export type Validator = ValidatorObject | ValidatorHandler;
export type ValidatorError = string | React.ReactNode;
export type ValidatorHandler = (value: string, props?: Props) => boolean | Promise<any>;

export interface ValidatorObject {
  autoBind?: (props: Props) => boolean;
  message?: ValidatorError | ((value: string, props?: Props) => ValidatorError)
  validate: ValidatorHandler
}

export type Props = React.HTMLProps<any> & {
  value?: string | number
  dirty?: boolean
  multiLine?: boolean;
  showErrors?: boolean | "all"
  showValidationIcon?: boolean;
  compactError?: boolean // hide errors block if it's valid (no errors)
  error?: any // might be used to re-run validators
  validators?: Validator | Validator[]
  iconLeft?: string | React.ReactNode;
  iconRight?: string | React.ReactNode;
  onChange?: (value: string | number) => void;
}

export interface State {
  valid?: boolean
  dirty?: boolean
  dirtyOnBlur?: boolean
  errors?: ValidatorError[]
}
