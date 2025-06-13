import OpenAI from "openai";
import { getTranslator, ITranslationError, ITranslationResult, ProviderCodeName, TranslateParams } from "../providers";
import { AITranslatePayload, createIsomorphicAction, MessageType, OpenAITextToSpeechPayload } from "../extension";
import { createLogger } from "../utils/createLogger";

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
    dangerouslyAllowBrowser: false, /* safe: since usage allowed *only* within service-worker */
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

// FIXME: figure out how to preserve letter case, e.g "AI-provider" -> "AI-провайдер"
export function getTranslationPrompt({ from: srcLang = "auto", to: targetLang, text }: Partial<TranslateParams>) {
  const system = `
Return ONLY this JSON:{"translation":"","detectedLang":"","transcription":null,"spellCorrection":null}
• Preserve punctuation, markup, line breaks
• Use ISO-639-1 code for detected lang
• Add transcription ONLY for single dictionary word / phrasal verb 
`.trim();

  const user = `
src=${srcLang} tgt=${targetLang}
${text}
`.trim();

  return { systemPrompt: system, userPrompt: user };
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
