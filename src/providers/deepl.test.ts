jest.mock("../storage", () => ({
  createStorage: jest.fn(() => ({
    get: jest.fn(() => "test-pro-key"),
    load: jest.fn(() => Promise.resolve()),
    set: jest.fn(),
  })),
}));

jest.mock("../i18n", () => ({
  getMessage: jest.fn((key: string) => key),
}));

jest.mock("./translator", () => {
  class Translator {
    static register = jest.fn();
    langFrom: Record<string, string>;
    langTo: Record<string, string>;

    constructor({ languages }: any) {
      this.langFrom = languages.from;
      this.langTo = languages.to;
    }

    protected request(_payload: unknown): Promise<unknown> {
      throw new Error("request mock not configured");
    }
  }

  return {
    Translator,
    isTranslationError: (error: { statusCode?: number }) => Number.isInteger(error?.statusCode),
  };
});

import { createDeeplRequest, Deepl, deeplApiAuthKey, getDeeplApiUrl, sanitizeDeeplApiKey } from "./deepl";
import { ProviderCodeName } from "./providers";
import { Translator } from "./translator";
import { createStorage } from "../storage";

describe("DeepL provider", () => {
  beforeEach(() => {
    (deeplApiAuthKey.get as jest.Mock).mockReset().mockReturnValue("test-pro-key");
    (deeplApiAuthKey.load as jest.Mock).mockClear();
    (deeplApiAuthKey.set as jest.Mock).mockClear();
  });

  it("registers DeepL as a translation provider", () => {
    expect(Translator.register).toHaveBeenCalledWith(ProviderCodeName.DEEPL, Deepl);
    expect(new Deepl().name).toBe(ProviderCodeName.DEEPL);
  });

  it("stores the API key in local storage", () => {
    expect(createStorage).toHaveBeenCalledWith("deepl_api_auth_key", { area: "local" });
  });

  it("selects the Free endpoint only for :fx keys", () => {
    expect(getDeeplApiUrl("free-key:fx")).toBe("https://api-free.deepl.com/v2");
    expect(getDeeplApiUrl("pro-key")).toBe("https://api.deepl.com/v2");
    expect(getDeeplApiUrl(undefined)).toBe("https://api-free.deepl.com/v2");
    expect(getDeeplApiUrl("")).toBe("https://api-free.deepl.com/v2");
  });

  it("sanitizes an API key for settings display", () => {
    expect(sanitizeDeeplApiKey("abcd1234wxyz")).toBe("abcd*-*wxyz");
    expect(sanitizeDeeplApiKey("abcd1234")).toBe("********");
    expect(sanitizeDeeplApiKey("abc")).toBe("***");
    expect(sanitizeDeeplApiKey("")).toBe("");
  });

  it("builds a JSON request without source_lang for auto detection", () => {
    const request = createDeeplRequest("free-key:fx", {
      from: "auto",
      to: "de",
      texts: ["Hello", "World"],
    });

    expect(request).toEqual({
      url: "https://api-free.deepl.com/v2/translate",
      requestInit: {
        method: "POST",
        headers: {
          Authorization: "DeepL-Auth-Key free-key:fx",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: ["Hello", "World"],
          target_lang: "DE",
        }),
      },
    });
  });

  it("adds source_lang when the source language is explicit", () => {
    const { requestInit } = createDeeplRequest("pro-key", {
      from: "en",
      to: "pt-br",
      texts: ["Hello"],
    });

    expect(JSON.parse(requestInit.body)).toEqual({
      text: ["Hello"],
      source_lang: "EN",
      target_lang: "PT-BR",
    });
  });

  it("returns translation text and detected language for a single request", async () => {
    const provider = new Deepl();
    const request = jest.fn().mockResolvedValue({
      translations: [{ text: "Hallo", detected_source_language: "EN" }],
    });
    (provider as any).request = request;

    await expect(provider.translate({ from: "auto", to: "de", text: "Hello" })).resolves.toEqual({
      translation: "Hallo",
      langDetected: "en",
    });
    expect(deeplApiAuthKey.load).toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith(createDeeplRequest("test-pro-key", {
      from: "auto",
      to: "de",
      texts: ["Hello"],
    }));
  });

  it("preserves input order when translateMany splits a batch", async () => {
    const provider = new Deepl();
    const texts = Array.from({ length: 51 }, (_, index) => `text-${index}`);
    const request = jest.fn().mockImplementation(({ requestInit }) => {
      const body = JSON.parse(requestInit.body);
      return Promise.resolve({
        translations: body.text.map((text: string) => ({
          text: `${text}-translated`,
          detected_source_language: "EN",
        })),
      });
    });
    (provider as any).request = request;

    await expect(provider.translateMany({ from: "auto", to: "de", texts })).resolves.toEqual(
      texts.map(text => `${text}-translated`)
    );
    expect(request).toHaveBeenCalledTimes(2);
    expect(JSON.parse(request.mock.calls[0][0].requestInit.body).text).toEqual(texts.slice(0, 50));
    expect(JSON.parse(request.mock.calls[1][0].requestInit.body).text).toEqual(texts.slice(50));
  });

  it("rejects a single text whose request body exceeds 128 KiB", () => {
    expect(() => createDeeplRequest("pro-key", {
      from: "auto",
      to: "de",
      texts: ["a".repeat(128 * 1024)],
    })).toThrow("DeepL API request exceeds the 128 KiB limit.");
  });

  it("splits translateMany requests before the 128 KiB body limit", async () => {
    const provider = new Deepl();
    const texts = ["a".repeat(70 * 1024), "b".repeat(70 * 1024)];
    const request = jest.fn().mockImplementation(({ requestInit }) => {
      const body = JSON.parse(requestInit.body);
      return Promise.resolve({
        translations: body.text.map((text: string) => ({
          text,
          detected_source_language: "EN",
        })),
      });
    });
    (provider as any).request = request;

    await expect(provider.translateMany({ from: "auto", to: "de", texts })).resolves.toEqual(texts);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("uses the current static DeepL source and target languages", () => {
    const provider = new Deepl();

    expect(provider.langFrom).toMatchObject({
      auto: "Auto-detect",
      ace: "Acehnese",
      he: "Hebrew",
      th: "Thai",
      vi: "Vietnamese",
      zh: "Chinese (unspecified variant)",
    });
    expect(provider.langFrom["zh-hant"]).toBeUndefined();
    expect(provider.langTo["es-es"]).toBeUndefined();
    expect(provider.langTo).toMatchObject({
      "en-us": "English (American)",
      "es-419": "Spanish (Latin American)",
      "zh-hans": "Chinese (simplified)",
      "zh-hant": "Chinese (traditional)",
    });
  });

  it.each([
    [403, "error_403_auth_failed"],
    [456, "DeepL API quota exceeded."],
    [429, "DeepL API rate limit exceeded. Please try again later."],
  ])("maps DeepL HTTP %i errors", async (statusCode, expectedMessage) => {
    const provider = new Deepl();
    (provider as any).request = jest.fn().mockRejectedValue({ statusCode, message: "generic error" });

    await expect(provider.translate({ from: "auto", to: "de", text: "Hello" })).rejects.toEqual({
      statusCode,
      message: expectedMessage,
    });
  });
});
