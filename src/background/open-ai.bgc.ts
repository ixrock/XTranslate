import OpenAI from "openai";
import { getTranslator, ITranslationError, ITranslationResult, ProviderCodeName, TranslateParams } from "../providers";
import { AITranslatePayload, createIsomorphicAction, MessageType, OpenAITextToSpeechPayload } from "../extension";
import { createLogger } from "../utils/createLogger";
import { isFirefox } from "../common-vars";

const logger = createLogger({ systemPrefix: "[AI]" });

export const translateTextAction = createIsomorphicAction({
  messageType: MessageType.OPENAI_TRANSLATION,
  handler: translateText,
});

export const textToSpeechAction = createIsomorphicAction({
  messageType: MessageType.OPENAI_TEXT_TO_SPEECH,
  handler: textToSpeech,
});

export function getAPI(params: { apiKey: string, provider: ProviderCodeName }) {
  return new OpenAI({
    apiKey: params.apiKey,
    baseURL: getTranslator(params.provider).apiUrl,
    dangerouslyAllowBrowser: isFirefox(), // allow for firefox, since not support `background.service_worker` api
    maxRetries: 0,
  });
}

export interface AITranslateResponse {
  translation: string;
  detectedLang: string;
  transcription?: string;
  spellCorrection?: string;
}

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

  try {
    const { userPrompt, systemPrompt } = getTranslationPrompt({
      from: sourceLanguage,
      to: targetLanguage,
      text: sanitizedText,
    });

    const response = await getAPI({ apiKey, provider }).chat.completions.create({
      model,
      n: 1,
      temperature: 1,
      response_format: {
        type: "json_object",
      },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const data = JSON.parse(response.choices[0].message.content) as AITranslateResponse;
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

export function getTranslationPrompt({ from: sourceLang, to: targetLang, text }: Partial<TranslateParams>) {
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
- Do NOT wrap the JSON in triple backticks
- Do NOT add comments or additional keys
- Preserve markup, punctuation and line breaks
- If translation == original, still output JSON but keep "translation" unchanged
`.trim();

  const userPrompt = `

Source lang: ${sourceLang ?? "auto-detect"}
Target lang: ${targetLang}
Text:
${text}
`.trim();

  return {
    systemPrompt,
    userPrompt,
  };
}

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
