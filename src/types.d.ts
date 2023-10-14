// Support import for custom module extensions
// https://www.typescriptlang.org/docs/handbook/modules.html#wildcard-module-declarations
// Use-cases:
// - mocked "black-boxed" npm-packages
// - webpack-handled imports for custom file extensions (e.g. import svg)

declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}

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
