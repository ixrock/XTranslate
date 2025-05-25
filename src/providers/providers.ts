// Supported list of translation providers (aka "translator")

export enum ProviderCodeName {
  GOOGLE = "google",
  BING = "bing",
  DEEPL = "deepl",
  OPENAI = "openai",
  DEEPSEEK = "deepseek",
  GROK = "grok",
}

// OpenAI models
export enum OpenAIModel {
  COST_EFFECTIVE = "gpt-4.1-mini",
  RECOMMENDED = "gpt-4.1",
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
  COST_EFFECTIVE = "grok-3-mini-beta",
  RECOMMENDED = "grok-3-beta",
}

// DeepSeek models
export const enum DeepSeekAIModel {
  CHAT = "deepseek-chat",
  THINKER = "deepseek-reasoner"
}
