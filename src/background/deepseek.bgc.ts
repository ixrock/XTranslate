import OpenAI from "openai";
import { ITranslationError, ITranslationResult, VendorCodeName } from "../vendors";
import { createLogger, disposer } from "../utils";
import { DeepSeekTranslatePayload, MessageType, onMessage } from "../extension";

const logger = createLogger({ systemPrefix: "DEEPSEEK_AI(helper)" });

export function listenDeepSeekRequests() {
  return disposer(
    onMessage(MessageType.DEEPSEEK_TRANSLATION, translateText),
  );
}

// API: https://api-docs.deepseek.com/
export function deepSeekApi(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
    dangerouslyAllowBrowser: false,
    maxRetries: 0,
  })
}

export async function translateText(params: DeepSeekTranslatePayload): Promise<ITranslationResult> {
  const {
    model = "deepseek-chat",
    targetLanguage,
    sourceLanguage,
    text = "",
  } = params;

  const { apiKey, ...sanitizedParams } = params;
  const isAutoDetect = !sourceLanguage;
  const sanitizedText = text.trim();

  const prompt = isAutoDetect
    ? `To "${targetLanguage}" and auto-detect the source language the text: ${sanitizedText}`
    : `From "${sourceLanguage}" to "${targetLanguage}" language the text: ${sanitizedText}`;

  try {
    const response = await deepSeekApi(apiKey).chat.completions.create({
      model,
      n: 1,
      temperature: 1.3, // https://api-docs.deepseek.com/quick_start/parameter_settings
      response_format: {
        type: "json_object"
      },
      messages: [
        { role: "system", content: `You are professional foreign languages translator.` },
        { role: "system", content: `Add transcription ONLY when provided full text is dictionary word, phrasal verbs` },
        { role: "system", content: `Spell correction might be suggested when translating text has issues or when you have more conscious way to say the same` },
        { role: "system", content: `Output JSON {translation, detectedLang, transcription, spellCorrection}` },
        { role: "user", content: prompt },
      ],
    });

    const data = JSON.parse(response.choices[0].message.content) as TranslateTextResponse;
    const { detectedLang, transcription, spellCorrection, translation } = data;

    const result: ITranslationResult = {
      vendor: VendorCodeName.DEEPSEEK,
      originalText: sanitizedText,
      translation: translation ?? sanitizedText,
      langDetected: detectedLang ?? sourceLanguage,
      langFrom: sourceLanguage ?? detectedLang,
      langTo: targetLanguage,
      transcription,
      spellCorrection,
      dictionary: [],
    };

    logger.info({ result, prompt, params: sanitizedParams });
    return result;

  } catch (err) {
    const error: ITranslationError = {
      message: String(err),
      statusCode: err.statusCode || err.status,
    };

    logger.error({ error, params: sanitizedParams, prompt });
    throw error;
  }
}

export interface TranslateTextResponse {
  translation: string;
  detectedLang: string;
  transcription?: string;
  spellCorrection?: string;
}
