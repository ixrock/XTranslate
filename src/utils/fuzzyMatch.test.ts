import { fuzzyMatch, FuzzyMatchResult } from "./fuzzyMatch";

describe("fuzzy search", () => {
  it("searching words are case insensitive", () => {
    const search = fuzzyMatch("test-123 blabla", "TEST");

    expect(search).toBeTruthy();
  });

  it("options.strict=true allows to check that every chunk is matched in area", () => {
    const search1 = fuzzyMatch("test-123 blabla", "test 777 12", { strict: true });
    const search2 = fuzzyMatch("test-123 blabla", "test 777 12", { strict: false }) as FuzzyMatchResult;

    expect(search1).toBeFalsy();
    expect(search2).toBeTruthy();
    expect(search2.matchedWords.length).toBe(2);
  });

  it("order of matched chunks doesn't matter", () => {
    const search1 = fuzzyMatch("test-123 blabla", "123 test", { strict: true });
    const search2 = fuzzyMatch("test-123 blabla", "-bla 123-", { strict: true, });

    expect(search1).toBeTruthy();
    expect(search2).toBeTruthy();
  });

  it("works with any language letters in unicode supported environments", () => {
    const searchWords = "好的 тест 123".split(/\s/);
    const searchArea = `- ${searchWords[0]} ___${searchWords[1]} test $${searchWords[2]}--,./_`;
    const result = fuzzyMatch(searchArea, searchWords.join(" ")) as FuzzyMatchResult;

    expect(result).toBeTruthy();
    expect(result.matchedWords).toEqual(searchWords);
  });

  it("options.wordReplacer callback allows to get search-area output string with replaced values", () => {
    const result = fuzzyMatch("0: Hello world!", "world 0", {
      wordReplacer: (val) => `[${val}]`,
    }) as FuzzyMatchResult;

    expect(result).toBeTruthy();
    expect(result.output).toBe(`[0]: Hello [world]!`);
  });
});
