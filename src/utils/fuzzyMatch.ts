// Improves string search capabilities

export interface FuzzyMatchOptions {
  strict?: boolean; // default: false
}

export interface FuzzyMatchResult {
  value: string; // matched chunk
  index: number; // matched `index` in provided input-string
  input: string;
}

export function fuzzyMatch(searchArea: string, search: string, { strict = false }: FuzzyMatchOptions = {}): false | FuzzyMatchResult[] {
  const searchPattern = search.replace(/[^a-z0-9а-я]+/gi, " ").trim();
  const searchChunks = searchPattern.split(" ");
  const searchPatternReg = new RegExp(`(${searchPattern.replace(/\s/g, "|")})`, "gi",);
  const searchResults: FuzzyMatchResult[] = Array
    .from(searchArea.matchAll(searchPatternReg))
    .map((item) => ({
      value: item[0],
      index: item.index,
      input: item.input,
    }));

  // checking that every part of the search is existing in search area
  if (strict) {
    const searchResultsUniq = new Set(searchResults.map(({ value }) => value));

    if (searchResultsUniq.size !== searchChunks.length) {
      return false;
    }
  }

  return searchResults.length ? searchResults : false;
}
