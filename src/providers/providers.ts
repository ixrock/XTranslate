// Translation providers

export enum ProviderCodeName {
  GOOGLE = "google",
  BING = "bing",
  XTRANSLATE_PRO = "xtranslate_pro",
}

export type Provider = (typeof ProviderCodeName)[keyof typeof ProviderCodeName]; // google, bing, etc.

export enum XTranslateProTTSVoice {
  Alloy = "alloy",
  Ash = "ash",
  Ballad = "ballad",
  Cedar = "cedar",
  Coral = "coral",
  Echo = "echo",
  Marin = "marin",
  Sage = "sage",
  Shimmer = "shimmer",
  Verse = "verse",
}