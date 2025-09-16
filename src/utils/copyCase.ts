// Restore letters case preserving original sentence structure, acronyms, etc.

export interface CopyCaseParams {
  fromLocale: string; // e.g. 'en-US'
  toLocale: string; // e.g. 'ru'
  fromText: string; // e.g "Hello World"
  toText: string; // "привет мир"
}

export const ACRONYM_REGX = /\b[A-Z]{2,}\b/g; // TODO: support

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
}

export function copyCase({ fromLocale, toLocale, fromText, toText }: CopyCaseParams): string {
  const fromSegmenter = new Intl.Segmenter(fromLocale, { granularity: 'sentence' });
  const toSegmenter = new Intl.Segmenter(toLocale, { granularity: 'sentence' });

  const rawFromSegments = Array.from(fromSegmenter.segment(fromText)).map(s => s.segment);
  const rawToSegments = Array.from(toSegmenter.segment(toText)).map(s => s.segment);

  const fromSentences = rawFromSegments.flatMap(splitSentences);
  const toSentences = rawToSegments.flatMap(splitSentences);

  const patched = toSentences.map((sentence, index) => {
    const from = fromSentences[index];
    if (!from) return sentence;

    const fChar = from.trim()[0];
    const tChar = sentence.trim()[0];

    const shouldUpper = fChar === fChar.toUpperCase() && fChar !== fChar.toLowerCase();
    const shouldLower = fChar === fChar.toLowerCase() && fChar !== fChar.toUpperCase();

    const newChar = shouldUpper ? tChar.toUpperCase()
      : shouldLower ? tChar.toLowerCase()
        : tChar;

    return sentence.replace(tChar, newChar);
  });

  return patched.join('');
}
