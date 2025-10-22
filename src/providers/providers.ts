// Supported list of translation providers (aka "translator")

export enum ProviderCodeName {
  GOOGLE = "google",
  BING = "bing",
  DEEPL = "deepl",
  OPENAI = "openai",
  DEEPSEEK = "deepseek",
  GROK = "grok",
  GEMINI = "gemini",
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
  COST_EFFECTIVE = "gpt-5-mini",
  RECOMMENDED = "gpt-5-chat-latest"
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

// Google models
export enum GeminiAIModel {
  RECOMMENDED = "gemini-2.0-flash",
  REASONING = "gemini-2.5-flash"
}

//
// Text-to-speech models
//
export enum OpenAIModelTTS {
  MINI = "gpt-4o-mini-tts",
  OTHER = "tts-1",
}

export enum OpenAIModelTTSVoice {
  Alloy = "alloy",
  Echo = "echo",
  Fable = "fable",
  Onyx = "onyx",
  Nova = "nova",
  Shimmer = "shimmer",
}

export enum GeminiAIModelTTS {
  FLASH = "gemini-2.5-flash-preview-tts",
  PRO = "gemini-2.5-pro-preview-tts"
}

export enum GeminiAIModelTTSVoice {
  Puck = "puck",
  Zephyr = "zephyr",
  Charon = "charon",
  Kore = "kore",
  Fenrir = "fenrir",
  Leda = "leda",
  Orus = "orus",
  Aoede = "aoede"
}
