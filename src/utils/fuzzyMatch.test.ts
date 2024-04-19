import { fuzzyMatch, FuzzyMatchResult } from "./fuzzyMatch";

describe("fuzzy search", () => {
  it("searching words are case insensitive by default", () => {
    const searchArea = [
      "lens-metrics",
      "4d612ccd-4ea6-4115-9ae8-74c05e68b295",
      "app.kubernetes.io/created-by=resource-stack",
      "app.kubernetes.io/act-managed-by=Lens",
      "app.kubernetes.io/name=lens-metrics",
      "kubernetes.io/metadata.name=metrics",
      "extensionVersion=v2.26.0-lens1",
      "Active",
    ].join("\n");

    const search = fuzzyMatch(searchArea, "Lens active") as FuzzyMatchResult;

    const search2 = fuzzyMatch(searchArea, "Lens active", {
      matchCase: true,
    }) as FuzzyMatchResult;

    const search3 = fuzzyMatch(searchArea, "Lens active", {
      matchCase: true,
      strict: true,
    });

    expect(search.matchedWords).toEqual(["lens", "active"]);
    expect(search2.matchedWords).toEqual(["Lens"]);
    expect(search3).toBeFalsy()
  })

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
