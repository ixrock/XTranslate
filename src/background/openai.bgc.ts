import OpenAI from "openai";
import type { ITranslationError, ITranslationResult } from "../vendors/translator";
import { createLogger, disposer } from "../utils";
import { MessageType, onMessage } from "../extension";

const logger = createLogger({ systemPrefix: "OPEN_AI(helper)" });

export function listenOpenAIApiRequests() {
  return disposer(
    onMessage(MessageType.OPENAI_TRANSLATION, translateText),
  );
}

export function getAPI(apiKey: string) {
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: false, /* safe: since usage allowed *only* within service-worker */
    maxRetries: 0,
  });
}

export interface TranslateTextParams {
  apiKey: string;
  model?: string; /* default: "gpt-4o" */
  text: string;
  targetLanguage: string;
  sourceLanguage?: string; /* if not provided translation-request considered as "auto-detect" */
}

export async function translateText(params: TranslateTextParams): Promise<ITranslationResult> {
  const {
    model = "gpt-4o",
    targetLanguage, sourceLanguage, text,
  } = params;
  const { apiKey, ...sanitizedParams } = params;
  const isAutoDetect = !sourceLanguage;

  const prompt = isAutoDetect
    ? `Translate a text into language "${targetLanguage}" and auto-detect the source language. Input: "${text}"`
    : `Translate a text from language "${sourceLanguage}" to "${targetLanguage}". Input: "${text}"`;

  try {
    const response = await getAPI(apiKey).chat.completions.create({
      model,
      messages: [
        { role: "system", content: `You are a professional text translator assistant who translates texts very accurate with knowledge of dialects and slang.` },
        { role: "system", content: `Try to obtain transcription ONLY for dictionary words or phrasal verbs for source/detected language.` },
        { role: "system", content: `Spell correction might be suggested for detected or provided source/detected language."` },
        { role: "system", content: `Output format is ["sourceLanguage", "transcription", "spellCorrection", "translation"]` },
        { role: "user", content: prompt }
      ],
    });

    const content = response.choices[0].message.content;
    const [detectedLang, transcription, spellCorrection, translatedText] = JSON.parse(content);

    const result: ITranslationResult = {
      vendor: "openai",
      originalText: text,
      translation: translatedText ?? text,
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

export function getModels(apiKey: string) {
  return getAPI(apiKey).models.list();
}
