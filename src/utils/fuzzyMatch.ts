// Improves string search capabilities

export interface FuzzyMatchOptions {
  strict?: boolean; // default: false
}

export function fuzzyMatch(searchArea: string, search: string, { strict = false }: FuzzyMatchOptions = {}): boolean {
  const searchPattern = search.replace(/[^a-z0-9]+/gi, " ").trim();
  const searchChunks = searchPattern.split(" ");
  const searchPatternReg = new RegExp(`(${searchPattern.replace(/\s/g, "|")})`, "gi",);
  const searchResultsRaw = Array.from(searchArea.matchAll(searchPatternReg));

  // checking that every part of the search is existing in search area
  if (strict) {
    const searchResultsUniq = new Set(searchResultsRaw.map(([match]) => match));

    return searchChunks.length === searchResultsUniq.size;
  }

  return searchResultsRaw.length > 0;
}
