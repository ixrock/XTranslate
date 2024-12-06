import OpenAI from "openai";
import type { ITranslationError, ITranslationResult } from "../vendors/translator";
import { createLogger, disposer } from "../utils";
import { MessageType, onMessage, OpenAITextToSpeechPayload } from "../extension";
import { isFirefox } from "../common-vars";

const logger = createLogger({ systemPrefix: "OPEN_AI(helper)" });

export function listenOpenAIApiRequests() {
  return disposer(
    onMessage(MessageType.OPENAI_TRANSLATION, translateText),
    onMessage(MessageType.OPENAI_TTS, textToSpeech),
  );
}

export function getAPI(apiKey: string) {
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: isFirefox(), // allow for firefox, since not support `background.service_worker` api
    maxRetries: 0,
  });
}

export function getModels(apiKey: string) {
  return getAPI(apiKey).models.list();
}

export interface TranslateTextParams {
  apiKey: string;
  model?: string; /* default: "gpt-4o" */
  text: string;
  targetLanguage: string;
  sourceLanguage?: string; /* if not provided translation-request considered as "auto-detect" */
}

// Text translation capabilities
export async function translateText(params: TranslateTextParams): Promise<ITranslationResult> {
  const {
    model = "gpt-4o",
    targetLanguage,
    sourceLanguage,
    text = "",
  } = params;
  const { apiKey, ...sanitizedParams } = params;
  const isAutoDetect = !sourceLanguage;
  const sanitizedText = text.trim();

  const prompt = isAutoDetect
    ? `Translate a text into language "${targetLanguage}" and auto-detect the source language for text "${sanitizedText}"`
    : `Translate a text from language "${sourceLanguage}" to "${targetLanguage}" for text "${sanitizedText}"`;

  try {
    const response = await getAPI(apiKey).chat.completions.create({
      model,
      messages: [
        { role: "system", content: `You are a professional text translator assistant who does its job very accurate with knowledge of language dialects and slang.` },
        { role: "system", content: `Transcription must be applied only if provided user text is dictionary word or phrasal verb or special language-specific phrase.` },
        { role: "system", content: `Spell correction must be applied only if there are possible syntax errors in provided text."` },
        { role: "system", content: `Output format is ["sourceLanguage", "transcription", "spellCorrection", "translation"]` },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0].message.content;
    const [detectedLang, transcription, spellCorrection, translatedText] = JSON.parse(content);

    const result: ITranslationResult = {
      vendor: "openai",
      originalText: sanitizedText,
      translation: translatedText ?? sanitizedText,
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

// TTS capabilities
// Docs: https://platform.openai.com/docs/api-reference/audio/createSpeech
export async function textToSpeech(params: OpenAITextToSpeechPayload): Promise<number[]> {
  const { apiKey, text, voice = "alloy", speed = 1 } = params;

  const speechFile = await getAPI(apiKey).audio.speech.create({
    model: "tts-1",
    voice: voice,
    input: text,
    speed: speed,
    response_format: "mp3",
  });

  const buffer = await speechFile.arrayBuffer();
  const transferableDataContainer = new Uint8Array(buffer);
  return Array.from(transferableDataContainer);
}
