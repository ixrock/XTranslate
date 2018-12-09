import { ValidatorError, ValidatorObject } from "./text-field.types";

export function wrapValidator(getError: () => ValidatorError): ValidatorObject {
  return {
    message: () => getError(),
    validate: () => !getError()
  }
}

export const Validators = {
  isRequired: <ValidatorObject>{
    autoBind: ({ required }) => required,
    message: "This field is required",
    validate: value => !!value.trim(),
  },

  isEmail: <ValidatorObject>{
    autoBind: ({ type }) => type === "email",
    message: "Wrong email format",
    validate: value => !!value.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/),
  },

  isNumber: <ValidatorObject>{
    autoBind: ({ type }) => type === "number",
    message: "Invalid number",
    validate: (value, { min, max }) => {
      var numVal = +value;
      return !(
        isNaN(numVal) ||
        (min != null && numVal < min) ||
        (max != null && numVal > max)
      )
    },
  },

  minLength: <ValidatorObject>{
    autoBind: ({ minLength }) => !!minLength,
    message: (value, { minLength }) => `Minimum length is ${minLength}`,
    validate: (value, { minLength }) => value.length >= minLength,
  },

  maxLength: <ValidatorObject>{
    autoBind: ({ maxLength }) => !!maxLength,
    message: (value, { maxLength }) => `Maximum length is ${maxLength}`,
    validate: (value, { maxLength }) => value.length <= maxLength,
  },
};
