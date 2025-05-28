import OpenAI from "openai";
import type { ResponseFormatJSONObject } from "openai/resources";
import { getTranslator, ITranslationError, ITranslationResult, ProviderCodeName, TranslateParams } from "../providers";
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
  const sanitizedText = text.trim();
  const responseFormatJson: ResponseFormatJSONObject = { type: "json_object" };
  const responseFormat = ![ProviderCodeName.GROK].includes(provider) ? responseFormatJson : undefined;

  try {
    const { userPrompt, systemPrompt } = getTranslationPrompts({
      from: sourceLanguage,
      to: targetLanguage,
      text: sanitizedText,
    });
    const response = await getAPI({ apiKey, provider: provider }).chat.completions.create({
      model,
      n: 1,
      temperature: .95,
      response_format: responseFormat,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
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

    logger.info({ response, data, result, params: sanitizedParams });
    return result;

  } catch (err) {
    const error: ITranslationError = {
      message: String(err),
      statusCode: err.statusCode || err.status,
    };

    logger.error({ error, params: sanitizedParams });
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

export function getTranslationPrompts({ from: sourceLang, to: targetLang, text }: Partial<TranslateParams>) {
  const systemPrompt = `
  
You are a professional translation assistant.
Return EXACTLY one JSON object with the following shape:

{
  "translation":   string,          // text translated to "${targetLang}"
  "detectedLang":  ISO-639-1 code,  // e.g. "en", "fi"
  "transcription": string|null,     // ONLY for single dictionary word or phrasal verb
  "spellCorrection": string|null    // non-empty if you fixed typos
}

Rules:
- Do NOT wrap the JSON in triple backticks.
- Do NOT add comments or additional keys.
- Preserve markup, punctuation and line breaks.
- If translation == original, still output JSON but keep "translation" unchanged.
`.trim();

  const userPrompt = `
  
Source language: ${sourceLang ?? "auto-detect"}
Target language: ${targetLang}

TEXT_TO_TRANSLATE:
<<<
${text}
>>>`.trim();

  return {
    systemPrompt,
    userPrompt,
  };
}
