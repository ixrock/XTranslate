// Supported list of translation providers (aka "translator")

export enum ProviderCodeName {
  GOOGLE = "google",
  BING = "bing",
  DEEPL = "deepl",
  OPENAI = "openai",
  DEEPSEEK = "deepseek",
  GROK = "grok",
}

export type Provider = (typeof ProviderCodeName)[keyof typeof ProviderCodeName];
export type ProviderWithApiKey = Exclude<Provider, "google" | "bing">;

export type AIModelTranslationKey =
  Lowercase<keyof typeof OpenAIModel>
  | Lowercase<keyof typeof GrokAIModel>
  | Lowercase<keyof typeof DeepSeekAIModel>
  ;

// OpenAI models
export enum OpenAIModel {
  COST_EFFECTIVE = "gpt-4.1-mini",
  RECOMMENDED = "gpt-4.1",
  REASONING_LIGHT = "o4-mini",
}

// OpenAI TTS voice characters
export enum OpenAIVoiceTTS {
  ALLOY = "alloy",
  ECHO = "echo",
  FABLE = "fable",
  ONYX = "onyx",
  NOVA = "nova",
  SHIMMER = "shimmer",
}

export enum OpenAIModelTTS {
  MINI = "gpt-4o-mini-tts",
  OTHER = "tts-1",
}

// Grok models (x.ai)
export enum GrokAIModel {
  COST_EFFECTIVE = "grok-3-mini",
  RECOMMENDED = "grok-3",
}

// DeepSeek models
export enum DeepSeekAIModel {
  RECOMMENDED = "deepseek-chat",
  REASONING = "deepseek-reasoner"
}
