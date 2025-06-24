// Restore the case of a text based on another text, preserving sentence structure and proper nouns.
// e.g. might be used to restore (first) letters case in translated texts based on the original text.

export function copyCase(fromText: string, toText: string, properNouns: string[] = []): string {
  const sentenceSegmenter = new Intl.Segmenter('ru', { granularity: 'sentence' });
  const fromSegments = Array.from(sentenceSegmenter.segment(fromText));
  const toSegments = Array.from(sentenceSegmenter.segment(toText));

  const properNounsLower = new Set(properNouns.map((word) => word.toLowerCase()));

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

    const restored =
      (shouldCapitalize
        ? firstToChar.toUpperCase()
        : firstToChar.toLowerCase()) + trimmedTo.slice(1);

    return restored;
  }

  function restoreProperNouns(text: string): string {
    return text
      .split(/\b/)
      .map((word) => {
        if (properNounsLower.has(word.toLowerCase())) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join('');
  }

  return toSegments
    .map((seg, i) => {
      const orig = fromSegments[i]?.segment ?? '';
      let cased = restoreCapitalization(orig, seg.segment);
      cased = restoreProperNouns(cased);
      return cased;
    })
    .join('');
}
