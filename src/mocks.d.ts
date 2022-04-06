// Support import for custom module extensions
// https://www.typescriptlang.org/docs/handbook/modules.html#wildcard-module-declarations
// Use-cases:
// - mocked "black-boxed" npm-packages
// - webpack-handled imports for custom file extensions (e.g. import svg)

declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}

// Declare everything what's bundled as webpack's type="asset/resource"
// Should be mocked for tests support in jestConfig.moduleNameMapper (currently in "/package.json")
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

declare module "*.woff?" {
  const content: string;
  export = content;
}

declare module "*.ttf" {
  const content: string;
  export = content;
}
