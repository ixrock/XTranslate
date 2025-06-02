import { AITranslationResponse, getAPI, loggerAI } from "./open-ai.bgc";
import { ITranslationError, ITranslationResult, TranslateParams } from "../providers";
import { AITranslatePayload, createIsomorphicAction, MessageType } from "../extension";

export const aiTranslateAction = createIsomorphicAction({
  messageType: MessageType.AI_TRANSLATION,
  handler: translateText,
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

  try {
    const { userPrompt, systemPrompt } = getAIPrompts({
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

    const data = JSON.parse(response.choices[0].message.content) as AITranslationResponse;
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

    loggerAI.info({ response, data, result, params: sanitizedParams });
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

export function getAIPrompts({ from: sourceLang, to: targetLang, text }: Partial<TranslateParams>) {
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
