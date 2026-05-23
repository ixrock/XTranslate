const mockStorageInstances = new Map<string, any>();
const mockGoogleTranslate = jest.fn();
const mockBingTranslate = jest.fn();
const mockGetLocale = jest.fn(() => "en");
const mockGetTranslator = jest.fn((name: string) => {
  if (name === "google") return { translate: mockGoogleTranslate };
  if (name === "bing") return { translate: mockBingTranslate };
  return undefined;
});

jest.mock("@/storage", () => ({
  createStorage: jest.fn((key: string, options: { defaultValue?: any } = {}) => {
    let value = clone(options.defaultValue);
    const storage = {
      key,
      get: jest.fn(() => value),
      toJS: jest.fn(() => clone(value)),
      set: jest.fn((nextValue: any) => {
        value = clone(nextValue);
      }),
      merge: jest.fn((update: any) => {
        value = {
          ...value,
          ...clone(update),
        };
      }),
      load: jest.fn(() => Promise.resolve()),
      reset: jest.fn(() => {
        value = clone(options.defaultValue);
      }),
    };

    mockStorageInstances.set(key, storage);
    return storage;
  }),
}), { virtual: true });

jest.mock("@/providers", () => ({
  ProviderCodeName: {
    GOOGLE: "google",
    BING: "bing",
  },
  getTranslator: mockGetTranslator,
}), { virtual: true });

jest.mock("@/i18n", () => ({
  getLocale: mockGetLocale,
}), { virtual: true });

import {
  adContextStore,
  CONTEXT_MAX_CHARS,
  getAdScores,
  getContextAd,
  getContextInEnglish,
  getDayKey,
  hasAvailableContextAd,
  trimContextText,
} from "./ad-context";
import adBrands from "./ad-brands.json";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function resetAdStore() {
  adContextStore.set({
    anonId: "anon-test",
    daily: {
      dayKey: getDayKey(),
      brands: {},
    },
  });
}

describe("affiliate/ad-context", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-23T12:00:00"));
    jest.spyOn(Math, "random").mockReturnValue(0);
    mockGoogleTranslate.mockReset();
    mockBingTranslate.mockReset();
    mockGetLocale.mockReturnValue("en");
    mockGetTranslator.mockClear();
    resetAdStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("matches a language-learning context to Preply", () => {
    const ad = getContextAd(
      "English language speaking practice with native tutor conversation, pronunciation, grammar and fluency lessons",
    );

    expect(ad).toEqual({
      brand: "Preply",
      title: "Learn languages with tutors",
      url: "https://preply.sjv.io/PzbzZR",
    });
  });

  it("matches a gaming connection context to GearUP", () => {
    const ad = getContextAd(
      "Online game lag, high ping, latency, packet loss and unstable multiplayer server connection in Valorant",
    );

    expect(ad).toEqual({
      brand: "GearUP",
      title: "Reduce lag in online games",
      url: "https://gearup.sjv.io/4aE9gr",
    });
  });

  it("does not show ads for unrelated context", () => {
    expect(getContextAd("The sky is gray and the window is open.")).toBeNull();
  });

  it("matches translation product copy to Preply with sqrt scoring", () => {
    const ad = getContextAd(
      "Translate from 100+ foreign languages to your native language directly at web-site you're reading or type some text at extension main window to get instant text translation.",
    );

    expect(ad).toEqual({
      brand: "Preply",
      title: "Learn languages with tutors",
      url: "https://preply.sjv.io/PzbzZR",
    });
  });

  it("does not show ads for a single low-weight keyword match", () => {
    expect(getContextAd("I am reading a blog post about breakfast.")).toBeNull();
  });

  it("applies negative keyword penalties when scoring brands", () => {
    const context = "Online game ping lag invoice bank salary";
    const gearUpScore = getAdScores(context)
      .find(({ brand }) => brand.name === "GearUP");

    expect(gearUpScore.matchedWeightSum).toBeGreaterThan(0);
    expect(gearUpScore.negativePenalty).toBe(15);
    expect(getContextAd(context)).toBeNull();
  });

  it("uses localized message variants and falls back by locale", () => {
    mockGetLocale.mockReturnValue("ru-RU");

    const ad = getContextAd(
      "English language speaking practice with native tutor conversation, pronunciation, grammar and fluency lessons",
    );

    expect(ad?.title).toBe("Изучайте языки с репетиторами");
  });

  it("rotates message variants and limits each brand to three daily shows", () => {
    const context = "English language speaking practice with native tutor conversation, pronunciation, grammar and fluency lessons";
    const shownTitles = [
      getContextAd(context)?.title,
      getContextAd(context)?.title,
      getContextAd(context)?.title,
    ];

    expect(new Set(shownTitles)).toEqual(new Set([
      "Learn languages with tutors",
      "Practice with native speakers",
      "Speak more fluently online",
    ]));
    expect(getContextAd(context)).toBeNull();
  });

  it("resets brand show limits on the next local day", () => {
    const context = "English language speaking practice with native tutor conversation, pronunciation, grammar and fluency lessons";

    getContextAd(context);
    getContextAd(context);
    getContextAd(context);
    expect(getContextAd(context)).toBeNull();

    jest.setSystemTime(new Date("2026-05-24T09:00:00"));

    expect(getContextAd(context)).toEqual({
      brand: "Preply",
      title: "Learn languages with tutors",
      url: "https://preply.sjv.io/PzbzZR",
    });
  });

  it("reports no available ads after all daily brand quotas are exhausted", () => {
    const brands = Object.fromEntries(adBrands.brands.map(({ name }) => [
      name,
      {
        shownCount: 3,
        usedMessageIndexes: [0, 1, 2],
      },
    ]));

    adContextStore.set({
      anonId: "anon-test",
      daily: {
        dayKey: getDayKey(),
        brands,
      },
    });

    expect(hasAvailableContextAd()).toBe(false);
  });

  it("keeps English context without provider calls", async () => {
    await expect(getContextInEnglish({
      sourceLang: "en",
      targetLang: "fr",
      text: "English language practice",
    })).resolves.toBe("English language practice");

    expect(mockGoogleTranslate).not.toHaveBeenCalled();
    expect(mockBingTranslate).not.toHaveBeenCalled();
  });

  it("translates non-English context to English even when targetLang is en", async () => {
    mockGoogleTranslate.mockResolvedValue({
      translation: "English language practice",
    });

    await expect(getContextInEnglish({
      sourceLang: "ru",
      targetLang: "en",
      text: "Практика английского языка",
    })).resolves.toBe("English language practice");

    expect(mockGoogleTranslate).toHaveBeenCalledWith({
      internal: true,
      from: "auto",
      to: "en",
      text: "Практика английского языка",
    });
    expect(mockBingTranslate).not.toHaveBeenCalled();
  });

  it("falls back to Bing when Google context translation fails", async () => {
    mockGoogleTranslate.mockRejectedValue(new Error("google failed"));
    mockBingTranslate.mockResolvedValue({
      translation: "Online game lag and ping",
    });

    await expect(getContextInEnglish({
      sourceLang: "ru",
      targetLang: "de",
      text: "Лаг и пинг в онлайн игре",
    })).resolves.toBe("Online game lag and ping");

    expect(mockGoogleTranslate).toHaveBeenCalledTimes(1);
    expect(mockBingTranslate).toHaveBeenCalledWith({
      internal: true,
      from: "auto",
      to: "en",
      text: "Лаг и пинг в онлайн игре",
    });
  });

  it("falls back to Bing when Google returns an empty context translation", async () => {
    mockGoogleTranslate.mockResolvedValue({
      translation: "",
    });
    mockBingTranslate.mockResolvedValue({
      translation: "Online game lag and ping",
    });

    await expect(getContextInEnglish({
      sourceLang: "ru",
      targetLang: "en",
      text: "Лаг и пинг в онлайн игре",
    })).resolves.toBe("Online game lag and ping");

    expect(mockBingTranslate).toHaveBeenCalledTimes(1);
  });

  it("trims oversized context before sending it to providers", async () => {
    const longText = Array.from({ length: 200 }, (_, index) => `слово${index}`).join(" ");
    mockGoogleTranslate.mockResolvedValue({
      translation: "Long translated context",
    });

    await getContextInEnglish({
      sourceLang: "ru",
      targetLang: "en",
      text: longText,
    });

    const translatedText = mockGoogleTranslate.mock.calls[0][0].text;
    expect(translatedText.length).toBeLessThanOrEqual(CONTEXT_MAX_CHARS);
    expect(translatedText).toBe(trimContextText(longText));
  });
});
