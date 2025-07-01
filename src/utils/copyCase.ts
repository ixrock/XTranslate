// Restore the case of a text based on another text, preserving sentence structure and proper nouns.
// e.g. might be used to restore (first) letters case in translated texts based on the original text.

export interface CopyCaseParams {
  fromText: string,
  toText: string,
  locale: string; // e.g. 'en-US'
  properNouns: string[]; // "Monday"
}

export function copyCase({ locale, toText, fromText, properNouns }: CopyCaseParams): string {
  const sentenceSegmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const fromSegments = Array.from(sentenceSegmenter.segment(fromText));
  const toSegments = Array.from(sentenceSegmenter.segment(toText));
  const properNounsLower = new Set(properNouns.map((word) => word.toLowerCase()));

  const acronymRegex = /\b[A-Z]{2,}\b/g;
  const acronyms = Array.from(new Set(fromText.match(acronymRegex) || []));

  function isLetter(char: string): boolean {
    return char.toLowerCase() !== char.toUpperCase();
  }

  function isUppercase(char: string): boolean {
    return char === char.toUpperCase();
  }

  function restoreCapitalization(from: string, to: string): string {
    const trimmedFrom = from.trim();
    const trimmedTo = to.trim();
    if (!trimmedFrom || !trimmedTo) return trimmedTo;

    const firstFromChar = trimmedFrom[0];
    const firstToChar = trimmedTo[0];

    const shouldCapitalize = isLetter(firstFromChar) && isUppercase(firstFromChar);

    return (shouldCapitalize
      ? firstToChar.toUpperCase()
      : firstToChar.toLowerCase()) + trimmedTo.slice(1);
  }

  function restoreProperNounsAndAcronyms(text: string): string {
    return text
      .split(/\b/)
      .map((word) => {
        const lower = word.toLowerCase();

        if (properNounsLower.has(lower)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }

        const upperAcronym = acronyms.find((a) => a.toLowerCase() === lower);
        if (upperAcronym) return upperAcronym;

        return word;
      })
      .join('');
  }

  return toSegments
    .map((seg, i) => {
      const orig = fromSegments[i]?.segment ?? '';
      let cased = restoreCapitalization(orig, seg.segment);
      cased = restoreProperNounsAndAcronyms(cased);
      return cased;
    })
    .join('');
}
