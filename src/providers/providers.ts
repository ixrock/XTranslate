// Supported list of translation providers (aka "translator")

export enum ProviderCodeName {
  GOOGLE = "google",
  BING = "bing",
  OPENAI = "openai",
  DEEPSEEK = "deepseek",
  GROK = "grok",
  GEMINI = "gemini",
  XTRANSLATE_PRO = "xtranslate_pro",
}

export type Provider = (typeof ProviderCodeName)[keyof typeof ProviderCodeName];
export type ProviderWithApiKey = Exclude<Provider, "google" | "bing" | "xtranslate_pro">;

export type AIModelTranslationKey =
  Lowercase<keyof typeof OpenAIModel>
  | Lowercase<keyof typeof GrokAIModel>
  | Lowercase<keyof typeof DeepSeekAIModel>
  ;

// OpenAI models
export enum OpenAIModel {
  COST_EFFECTIVE = "gpt-5.4-nano",
  RECOMMENDED = "gpt-5.5"
}

// Grok models (x.ai)
export enum GrokAIModel {
  RECOMMENDED = "grok-4.20-non-reasoning",
  REASONING = "grok-4.20",
}

// DeepSeek models
export enum DeepSeekAIModel {
  RECOMMENDED = "deepseek-v4-flash",
  REASONING = "deepseek-v4-pro"
}

// Google models
export enum GeminiAIModel {
  RECOMMENDED = "gemini-2.5-flash-lite",
  REASONING = "gemini-2.5-flash"
}

export enum OpenAIModelTTSVoice {
  Alloy = "alloy",
  Echo = "echo",
  Fable = "fable",
  Onyx = "onyx",
  Nova = "nova",
  Shimmer = "shimmer",
}
