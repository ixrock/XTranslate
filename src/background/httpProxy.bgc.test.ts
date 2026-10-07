jest.mock("../extension/runtime", () => ({
  isBackgroundWorker: jest.fn(),
  onMessage: jest.fn(),
  sendMessage: jest.fn(),
}));

jest.mock("../utils", () => ({
  blobToBase64DataUrl: jest.fn(),
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    time: jest.fn(),
  })),
  toBinaryFile: jest.fn(),
}));

import { createLogger } from "../utils";
import { ProxyResponseType } from "../extension/messages";
import { handleProxyRequestPayload } from "./httpProxy.bgc";

const logger = (createLogger as jest.Mock).mock.results[0].value;

describe("background HTTP proxy", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    logger.error.mockClear();
  });

  it("wraps a rejected fetch in a structured proxy error without logging authorization", async () => {
    const url = "https://api-free.deepl.com/v2/translate";
    const apiKey = "private-api-key:fx";
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(handleProxyRequestPayload({
      url,
      responseType: ProxyResponseType.JSON,
      requestInit: {
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
        },
      },
    })).rejects.toEqual({
      statusCode: 0,
      message: "Failed to fetch",
    });

    expect(logger.error).toHaveBeenCalledWith(`proxy request failed: ${url}`, "Failed to fetch");
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(apiKey);
  });

  it("preserves structured HTTP errors", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ message: "Invalid authentication key" }),
      {
        status: 403,
        statusText: "Forbidden",
        headers: { "Content-Type": "application/json" },
      },
    ));

    await expect(handleProxyRequestPayload({
      url: "https://api-free.deepl.com/v2/translate",
      responseType: ProxyResponseType.JSON,
    })).rejects.toEqual({
      statusCode: 403,
      message: "Invalid authentication key",
    });
  });
});
