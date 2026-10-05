// Translation providers

export enum ProviderCodeName {
  GOOGLE = "google",
  BING = "bing",
  XTRANSLATE_PRO = "xtranslate_pro",
}

export type Provider = (typeof ProviderCodeName)[keyof typeof ProviderCodeName]; // google, bing, etc.

export enum XTranslateProTTSVoice {
  Alloy = "alloy",
  Echo = "echo",
  Fable = "fable",
  Onyx = "onyx",
  Nova = "nova",
  Shimmer = "shimmer",
}
