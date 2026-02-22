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
      fromText: "1 example.",
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
});
