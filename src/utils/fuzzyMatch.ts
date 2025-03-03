// Improves string search capabilities

export interface FuzzyMatchOptions {
  strict?: boolean; // ensure that every part of valuable search chunk exists in searching area (default: false)
  matchCase?: boolean; // word-case matching (default: false)
  wordReplacer?: (matchedChunk: string) => string;
}

export interface FuzzyMatchResult {
  output?: string;
  matchedWords: string[];
}

export function fuzzyMatch(searchArea: string, search: string, opts: FuzzyMatchOptions = {}): false | FuzzyMatchResult {
  if (!searchArea) return false;
  const { strict = false, matchCase = false, wordReplacer } = opts;

  // Splits search request into chunks that contain only language sentences (any language) or numbers (0-9)
  // Works only with unicode flag "u" supported environments (required to match /\p{Letter}/)
  // Read more: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape
  const searchWords: string[] = normalize(search).match(/(?:\p{Letter}|\d)+/gmu) ?? [];
  const searchPattern = new RegExp(`(?:${searchWords.join("|")})`, `gm${matchCase ? "" : "i"}`);
  const matchedWords = new Set(searchArea.match(searchPattern)?.map(normalize));

  function normalize(word: string) {
    return matchCase ? word : word.toLowerCase();
  }

  // checking that every part of the search is existing in search area
  if (strict) {
    const matchedAll = searchWords.every(word => matchedWords.has(word));
    if (!matchedAll) {
      return false;
    }
  }

  if (matchedWords.size > 0) {
    let outputStr = searchArea;
    const wordsList: string[] = Array.from(matchedWords);

    // replace found matches with another value for output string
    if (wordReplacer) {
      const replacementRegExp = new RegExp(`(?:${wordsList.join("|")})`, `gm${matchCase ? "" : "i"}`);
      outputStr = searchArea.replaceAll(replacementRegExp, wordReplacer);
    }

    return {
      output: outputStr,
      matchedWords: wordsList,
    }
  }

  return false;
}
