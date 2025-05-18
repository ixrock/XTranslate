import OpenAI from "openai";
import { getTranslator, ITranslationError, ITranslationResult, ProviderCodeName } from "../providers";
import { createLogger, disposer } from "../utils";
import { AITranslatePayload, isBackgroundWorker, MessageType, onMessage, OpenAITextToSpeechPayload, sendMessage } from "../extension";

const logger = createLogger({ systemPrefix: "AI_TRANSLATION(helper)" });

export function listenAIRequests() {
  return disposer(
    onMessage(MessageType.AI_TRANSLATION, translateText),
    onMessage(MessageType.AI_TEXT_TO_SPEECH, textToSpeech),
  );
}

export function getAPI(params: { apiKey: string, provider: ProviderCodeName }) {
  return new OpenAI({
    apiKey: params.apiKey,
    baseURL: getTranslator(params.provider).apiUrl,
    dangerouslyAllowBrowser: false, /* safe: since usage allowed *only* within service-worker */
    maxRetries: 0,
  });
}

export interface AITranslateTextResponse {
  translation: string;
  detectedLang: string;
  transcription?: string;
  spellCorrection?: string;
}

/**
 * Text translation capabilities
 */
export async function translateText(params: AITranslatePayload): Promise<ITranslationResult> {
  const {
    provider,
    model,
    targetLanguage,
    sourceLanguage,
    text = "",
  } = params;
  const { apiKey, ...sanitizedParams } = params;
  const isAutoDetect = !sourceLanguage;
  const sanitizedText = text.trim();

  const prompt = isAutoDetect
    ? `Translate to "${targetLanguage}" and auto-detect source language of text: ${sanitizedText}`
    : `Translate from "${sourceLanguage}" to "${targetLanguage}" language of text: ${sanitizedText}`;

  try {
    const response = await getAPI({ apiKey, provider: provider }).chat.completions.create({
      model,
      n: 1,
      temperature: 1.3,
      response_format: {
        type: "json_object"
      },
      messages: [
        { role: "system", content: `You are professional languages translator assistant.` },
        { role: "system", content: `Add transcription ONLY when provided full text is dictionary word, phrasal verbs.` },
        { role: "system", content: `Output JSON {translation, detectedLang, transcription?, spellCorrection?}` },
        { role: "user", content: prompt },
      ],
    });

    const data = JSON.parse(response.choices[0].message.content) as AITranslateTextResponse;
    const { detectedLang, transcription, spellCorrection, translation } = data;

    const result: ITranslationResult = {
      vendor: provider,
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

/**
 * Text-to-speech capabilities
 */
export async function textToSpeech(params: OpenAITextToSpeechPayload): Promise<number[]> {
  const {
    apiKey, text, model, provider,
    speed = 1,
    voice = "alloy",
    response_format = "mp3"
  } = params;

  const speechFile = await getAPI({ apiKey, provider: provider }).audio.speech.create({
    model: model,
    voice: voice,
    input: text,
    speed: speed,
    response_format,
  });

  const buffer = await speechFile.arrayBuffer();
  const transferableDataContainer = new Uint8Array(buffer);

  return Array.from(transferableDataContainer);
}

export async function aiTranslateAction<P extends AITranslatePayload>(payload: P) {
  if (isBackgroundWorker()) {
    return translateText(payload);
  }

  return sendMessage<P>({
    type: MessageType.AI_TRANSLATION,
    payload,
  });
}

export async function aiTextToSpeechAction<P extends OpenAITextToSpeechPayload>(payload: P) {
  if (isBackgroundWorker()) {
    return textToSpeech(payload);
  }

  return sendMessage<P>({
    type: MessageType.AI_TEXT_TO_SPEECH,
    payload,
  });
}
