import OpenAI from "openai";
import { z, TypeOf } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getTranslator, ITranslationError, ITranslationResult, ProviderCodeName } from "../providers";
import { createLogger, disposer } from "../utils";
import { AITranslatePayload, isBackgroundWorker, MessageType, onMessage, OpenAITextToSpeechPayload, sendMessage } from "../extension";

export const loggerAI = createLogger({ systemPrefix: "AI" });

export function listenOpenAIRequests() {
  return disposer(
    onMessage(MessageType.OPENAI_TRANSLATION, translateText),
    onMessage(MessageType.OPENAI_TEXT_TO_SPEECH, textToSpeech),
  );
}

export async function openAiTranslateAction(payload: AITranslatePayload): Promise<ITranslationResult> {
  if (isBackgroundWorker()) {
    return translateText(payload);
  }

  return sendMessage<AITranslatePayload, ITranslationResult>({
    type: MessageType.OPENAI_TRANSLATION,
    payload,
  });
}

export async function openAiTextToSpeechAction(payload: OpenAITextToSpeechPayload): Promise<Uint8Array | number[]> {
  if (isBackgroundWorker()) {
    return textToSpeech(payload);
  }

  return sendMessage({
    type: MessageType.OPENAI_TEXT_TO_SPEECH,
    payload,
  });
}

export function getAPI(params: { apiKey: string, provider: ProviderCodeName }) {
  return new OpenAI({
    apiKey: params.apiKey,
    baseURL: getTranslator(params.provider).apiUrl,
    dangerouslyAllowBrowser: false, /* safe: since usage allowed *only* within service-worker */
    maxRetries: 0,
  });
}

export type AITranslationResponse = TypeOf<typeof AITranslationJsonSchema>;

export const AITranslationJsonSchema = z.object({
  translation: z.string(),
  detectedLang: z.string(),
  transcription: z.string().nullable(),
  spellCorrection: z.string().nullable(),
});

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

  const systemPrompt = [
    `You are a professional translation assistant with following rules:`,
    `- Use ISO-639-1 for detected lang, e.g. "en", "fi"`,
    `- Preserve markup, punctuation and line breaks`,
  ].join("\n");

  const userPrompt = [
    `Source lang: ${sourceLanguage ?? "auto-detect"}`,
    `Target lang: ${targetLanguage}`,
    `Text:\n\n${sanitizedText}`
  ].join("\n");

  try {
    const response = await getAPI({ apiKey, provider }).responses.parse({
      model,
      temperature: .95,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      text: {
        format: zodTextFormat(AITranslationJsonSchema, "translation"),
      }
    });

    const { detectedLang, transcription, spellCorrection, translation } = response.output_parsed;

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

    loggerAI.info({ response, result, params: sanitizedParams });

    return result;
  } catch (err) {
    const error: ITranslationError = {
      message: String(err),
      statusCode: err.statusCode || err.status,
    };

    loggerAI.error({ error, params: sanitizedParams });
    throw error;
  }
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
