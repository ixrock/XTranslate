export * from "./translator"

export const enum VendorCodeName {
  GOOGLE = "google",
  BING = "bing",
  YANDEX = "yandex",
  DEEPL = "deepl",
  OPENAI = "openai",
}

export * from './google.vendor'
export * from './yandex.vendor'
export * from './bing.vendor'
export * from './deepl.vendor'
export * from './open-ai.vendor'
