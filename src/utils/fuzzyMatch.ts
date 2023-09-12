// Improves string search capabilities

export interface FuzzyMatchOptions {
  strict?: boolean; // default: false
  wordReplacer?: (matchedChunk: string) => string;
}

export interface FuzzyMatchResult {
  output?: string;
  matchedWords: string[];
}

export function fuzzyMatch(searchArea: string, search: string, opts: FuzzyMatchOptions = {}): false | FuzzyMatchResult {
  const { strict = false, wordReplacer } = opts;

  // Splits search request into chunks that contain only language sentences (any language) or numbers (0-9)
  // Works only with unicode flag "u" supported environments (required to match /\p{Letter}/)
  // Read more: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Unicode_character_class_escape
  const searchWords: string[] = search.match(/(?:\p{Letter}|\d)+/gmiu) ?? [];
  const searchPattern = new RegExp(`(${searchWords.join("|")})`, "gmi");
  const matchedWords = new Set(searchArea.match(searchPattern) ?? []);

  // checking that every part of the search is existing in search area
  if (strict && matchedWords.size !== searchWords.length) {
    return false;
  }

  if (matchedWords.size > 0) {
    let outputStr = searchArea;
    const wordsList: string[] = Array.from(matchedWords);

    // replace found matches with another value for output string
    if (wordReplacer) {
      const replacementRegExp = new RegExp(`(${wordsList.join("|")})`, "mgi",);
      outputStr = searchArea.replaceAll(replacementRegExp, wordReplacer);
    }

    return {
      output: outputStr,
      matchedWords: wordsList,
    }
  }

  return false;
}
