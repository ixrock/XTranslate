import OpenAI from "openai";
import { ITranslationError, ITranslationResult, VendorCodeName, OpenAIModel } from "../vendors";
import { createLogger, disposer } from "../utils";
import { MessageType, onMessage, OpenAITextToSpeechPayload } from "../extension";

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
    dangerouslyAllowBrowser: false, /* safe: since usage allowed *only* within service-worker */
    maxRetries: 0,
  });
}

export interface TranslateTextParams {
  apiKey: string;
  model?: OpenAIModel; /* default: "gpt-4o" */
  text: string;
  targetLanguage: string;
  sourceLanguage?: string; /* if not provided translation-request considered as "auto-detect" */
}

export interface TranslateTextResponse {
  translation: string;
  detectedLang: string;
  transcription?: string;
  spellCorrection?: string;
}

// Text translation capabilities
export async function translateText(params: TranslateTextParams): Promise<ITranslationResult> {
  const {
    model = OpenAIModel.RECOMMENDED,
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
    const response = await getAPI(apiKey).chat.completions.create({
      model,
      n: 1,
      temperature: 1,
      response_format: {
        type: "json_object"
      },
      messages: [
        { role: "system", content: `You are a professional text translator assistant` },
        { role: "system", content: `Add transcription ONLY when provided full text is dictionary word, phrasal verbs` },
        { role: "system", content: `Spell correction might be suggested when translating text has issues or when you have more relevant option to say the same whole text"` },
        { role: "system", content: `Output JSON {translation, detectedLang, transcription, spellCorrection}` },
        { role: "user", content: prompt },
      ],
    });

    const data = JSON.parse(response.choices[0].message.content) as TranslateTextResponse;
    const { detectedLang, transcription, spellCorrection, translation } = data;

    const result: ITranslationResult = {
      vendor: VendorCodeName.OPENAI,
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
