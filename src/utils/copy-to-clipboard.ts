import { getTranslator, ITranslationResult } from "../providers";
import { getMessage } from "../i18n";

interface CopyToClipboardOptions {
  sourceText?: boolean;
  translatorInfo?: boolean;
}

export async function copyToClipboard(result: ITranslationResult, options: CopyToClipboardOptions = {}) {
  const { translation, transcription, langTo, langDetected, vendor: provider, dictionary, originalText, } = result;
  const { sourceText, translatorInfo } = options;

  const translator = getTranslator(provider);
  const texts = [
    sourceText ? originalText : "",

    `${translation}${transcription ? `(${transcription})` : ""}`,
    ...dictionary.map(({ wordType, meanings }) => {
      return `${wordType}: ${meanings.map(({ word }) => word).join(", ")}`;
    }),

    // add "copied with ..." at the end
    translatorInfo ? (
      getMessage("translated_with", {
        translator: translator.title,
        lang: translator.getLangPairTitle(langDetected, langTo),
      })
    ) : ""
  ].join("\n");

  try {
    await navigator.clipboard.writeText(texts);
  } catch (error) {
    throw new Error(`Failed to copy translation to clipboard: ${error}`);
  }
}
