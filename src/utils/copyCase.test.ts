import { copyCase } from "./copyCase";

describe("utils/copyCase", () => {
  it("lowercases first letter when source sentence starts lowercase", () => {
    const translation = copyCase({
      fromLocale: "en-US",
      toLocale: "ru",
      fromText: "hello world.",
      toText: "Привет мир.",
    });

    expect(translation).toEqual("привет мир.");
  });

  it("handles sentences with exclamation and question marks", () => {
    const translation = copyCase({
      fromLocale: "en-US",
      toLocale: "ru",
      fromText: "Hello! How are you?",
      toText: "привет! как дела?",
    });

    expect(translation).toEqual("Привет! Как дела?");
  });

  it("leaves extra target sentences unchanged when source has fewer sentences", () => {
    const translation = copyCase({
      fromLocale: "en-US",
      toLocale: "ru",
      fromText: "Hello.",
      toText: "привет. как дела?",
    });

    // only the first sentence should be case-matched; the additional sentence remains as-is
    expect(translation).toEqual("Привет. как дела?");
  });

  it("does not change target when source starts with a non-letter (digits) and when first char has no letter case", () => {
    const translation = copyCase({
      fromLocale: "en-US",
      toLocale: "ru",
      fromText: "123 go.",
      toText: "пример.",
    });

    // source first char is a digit, so no casing rule applies and target stays the same
    expect(translation).toEqual("пример.");
  });

  it("respects uppercase for accented letters in the source first character", () => {
    const translation = copyCase({
      fromLocale: "fr-FR",
      toLocale: "ru",
      fromText: "Éxample.",
      toText: "пример.",
    });

    expect(translation).toEqual("Пример.");
  });

  // New tests for various edge-cases
  describe("edge cases", () => {
    it("handles when toText contains more sentences than fromText", () => {
      const translation = copyCase({
        fromLocale: "en-US",
        toLocale: "ru",
        fromText: "Hello world.",
        toText: "привет мир. как дела?",
      });
      // Only the first sentence is patched (with matching from sentence) and the rest remains unchanged.
      expect(translation).toEqual("Привет мир. как дела?");
    });

    it("handles a single sentence without punctuation", () => {
      const translation = copyCase({
        fromLocale: "en-US",
        toLocale: "ru",
        fromText: "Hello world",
        toText: "привет мир",
      });
      // Even without terminal punctuation, the case of the first letter should be adjusted.
      expect(translation[0]).toEqual("П");
    });

    it("keeps non-alphabetic first characters unchanged", () => {
      const translation = copyCase({
        fromLocale: "en-US",
        toLocale: "ru",
        fromText: "\"Hello world.\"",
        toText: "\"привет мир.\"",
      });
      // Since the first character is a quote, it remains unchanged.
      expect(translation[0]).toEqual("\"");
      expect(translation).toEqual('"привет мир."');
    });
  });
});
