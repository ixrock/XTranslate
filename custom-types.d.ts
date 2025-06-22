// Support import for custom module extensions
// https://www.typescriptlang.org/docs/handbook/modules.html#wildcard-module-declarations
// Use-cases:
// - mocked "black-boxed" npm-packages
// - webpack-handled imports for custom file extensions (e.g. import svg)

declare module "*.module.css";
declare module "*.module.scss";

//
// Images
//
declare module "*.svg" {
  const content: string;
  export = content; // base64 data-url, see also `webpack.config.ts`
}
declare module "*.jpg" {
  const content: string;
  export = content;
}
declare module "*.png" {
  const content: string;
  export = content;
}

//
// Font URLs
//
declare module "*.woff" {
  const content: string;
  export = content;
}

declare module "*.ttf" {
  const content: string;
  export = content;
}

//
// Plain text files
//
declare module "*.txt" {
  const content: string;
  export = content;
}
declare module "*.md" { // markdown
  const content: string;
  export = content;
}
declare module "*.ftl" { // fluent (localization)
  const content: string;
  export = content;
}

//
// Advanced types
//
declare type Writeable<T> = { -readonly [P in keyof T]: T[P] };

declare type ValueOf<T> = T[keyof T];

declare type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
}
