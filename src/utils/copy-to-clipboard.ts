import { getTranslator, ITranslationResult } from "../vendors";
import { getMessage } from "../i18n";

interface CopyToClipboardOptions {
  sourceText?: boolean;
  withVendor?: boolean;
}

export async function copyToClipboard(result: ITranslationResult, options: CopyToClipboardOptions = {}) {
  const { translation, transcription, langTo, langDetected, vendor, dictionary, originalText, } = result;
  const { sourceText, withVendor } = options;

  const translator = getTranslator(vendor);
  const texts = [
    sourceText ? originalText : "",

    `${translation}${transcription ? `(${transcription})` : ""}`,
    ...dictionary.map(({ wordType, meanings }) => {
      return `${wordType}: ${meanings.map(({ word }) => word).join(", ")}`;
    }),

    // add "copied with ..." at the end
    withVendor ? (
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
