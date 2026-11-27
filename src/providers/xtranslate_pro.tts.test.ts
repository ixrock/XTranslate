import { XTranslateProTTSVoice } from "./providers";
import type { XTranslatePro } from "./xtranslate_pro";

const mockFetchBlob = jest.fn();
let mockVoice: XTranslateProTTSVoice;

jest.mock("./index", () => ({
  ...jest.requireActual("./providers"),
  Translator: class {
    static register() {}
    stopSpeaking() {}
    logger = { info: jest.fn(), error: jest.fn() };
    request = mockFetchBlob;
  },
}));
jest.mock("@/pro", () => ({
  userStore: { get data() { return { ttsVoice: mockVoice }; } },
  userStorage: { load: jest.fn() },
}), { virtual: true });
jest.mock("@/utils", () => ({
  ...jest.requireActual("../utils/base64"),
  blobToBase64DataUrl: async (blob: Blob) =>
    `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`,
}), { virtual: true });
jest.mock("@/extension", () => jest.requireActual("../extension/messages"), { virtual: true });
jest.mock("@/storage", () => ({ createStorage: jest.fn() }), { virtual: true });
jest.mock("@/config", () => ({ websiteURL: "https://example.test" }), { virtual: true });
jest.mock("@/background/metrics.bgc", () => ({}), { virtual: true });
jest.mock("@/i18n", () => ({}), { virtual: true });

const mp3Bytes = Uint8Array.of(0xff, 0xf3, 0xc4, 0xc4, 0, 0x80, 0xc3, 0xa9);
const audio = new Blob([mp3Bytes], { type: "audio/mpeg" });
const postStream = jest.fn();
let receive: (msg: object) => void;
let records: Record<string, unknown>;
let provider: XTranslatePro;

function reloadProvider(): XTranslatePro {
  jest.resetModules(); // An extension page reload clears the in-memory cache.
  const { XTranslatePro } = jest.requireActual<typeof import("./xtranslate_pro")>("./xtranslate_pro");
  return new XTranslatePro();
}

class TestMediaSource extends EventTarget {
  static isTypeSupported() { return true; }
  constructor() {
    super();
    queueMicrotask(() => this.dispatchEvent(new Event("sourceopen")));
  }
  addSourceBuffer() {
    return Object.assign(new EventTarget(), { appendBuffer: jest.fn() });
  }
}

beforeEach(() => {
  mockVoice = XTranslateProTTSVoice.Echo;
  records = {};
  mockFetchBlob.mockReset().mockResolvedValue(audio);
  postStream.mockReset().mockImplementation(() => receive({ chunk: Array.from(mp3Bytes) }));
  const storage = {
    getKeys: async () => Object.keys(records),
    get: async (keys: string[]) => Object.fromEntries(keys.map(key => [key, records[key]])),
    set: async (entries: object) => Object.assign(records, entries),
    remove: async (key: string) => { delete records[key]; },
  };
  Object.assign(globalThis, {
    window: { atob, MediaSource: TestMediaSource },
    MediaSource: TestMediaSource,
    document: { createElement: () => ({ play: async () => {} }) },
    chrome: {
      storage: { local: storage },
      runtime: { connect: () => ({
        postMessage: postStream, disconnect: jest.fn(),
        onDisconnect: { addListener: jest.fn() },
        onMessage: { addListener: (listener: typeof receive) => { receive = listener; } },
      }) },
    },
  });
  jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  provider = reloadProvider();
});

afterEach(() => jest.restoreAllMocks());

it.each([false, true])("shares Play with Download (stream already finished: %s)", async finished => {
  await provider.streamAudio(" hello world ", "auto");
  if (finished) receive({ done: true });
  const download = provider.getAudioFile("hello world", "en");
  if (!finished) {
    await new Promise(resolve => setImmediate(resolve));
    receive({ done: true });
  }
  expect(new Uint8Array(await (await download).arrayBuffer())).toEqual(mp3Bytes);
  expect(postStream).toHaveBeenCalledTimes(1);
  expect(JSON.parse(postStream.mock.calls[0][0].requestInit.body)).toEqual({ text: "hello world", voice: "echo" });
  expect(mockFetchBlob).not.toHaveBeenCalled();
});

it("shares a Download with Play and preserves all MP3 bytes across a reload", async () => {
  await provider.getAudioFile("shortage", "en");
  expect(await provider.streamAudio("shortage", "auto")).toBe(true);
  const restored = await reloadProvider().getAudioFile("shortage", "auto");
  expect(restored.type).toBe("audio/mpeg");
  expect(new Uint8Array(await restored.arrayBuffer())).toEqual(mp3Bytes);
  expect(mockFetchBlob).toHaveBeenCalledTimes(1);
  expect(postStream).not.toHaveBeenCalled();

  mockVoice = XTranslateProTTSVoice.Coral;
  await provider.getAudioFile("shortage", "en");
  expect(mockFetchBlob.mock.calls.map(([req]) => JSON.parse(req.requestInit.body).voice)).toEqual(["echo", "coral"]);
});

it("plays the result of an unfinished Download without starting a stream", async () => {
  const pending = Promise.withResolvers<Blob>();
  mockFetchBlob.mockReturnValueOnce(pending.promise);
  const download = provider.getAudioFile("hello world", "en");
  const play = provider.streamAudio(" hello world ", "auto");
  await new Promise(resolve => setImmediate(resolve));
  expect(mockFetchBlob).toHaveBeenCalledTimes(1);
  expect(postStream).not.toHaveBeenCalled();
  pending.resolve(audio);
  expect(await download).toBe(audio);
  expect(await play).toBe(true);
  expect(postStream).not.toHaveBeenCalled();
});

it("retries after a non-audio Download response", async () => {
  mockFetchBlob.mockResolvedValueOnce(new Blob(["{}"], { type: "application/json" }));
  await expect(provider.getAudioFile("shortage", "en")).rejects.toThrow("no playable audio");
  expect(await provider.getAudioFile("shortage", "en")).toBe(audio);
  expect(mockFetchBlob).toHaveBeenCalledTimes(2);
});

it("releases a waiting Download when playback cancels an unfinished stream", async () => {
  await provider.streamAudio("shortage", "auto");
  const waiting = provider.getAudioFile("shortage", "en");
  await new Promise(resolve => setImmediate(resolve));
  provider.stopSpeaking();
  await expect(waiting).rejects.toThrow("disconnected");
  expect(await provider.getAudioFile("shortage", "en")).toBe(audio);
  expect(mockFetchBlob).toHaveBeenCalledTimes(1);
});

it("restores legacy entries across languages and treats an omitted legacy voice as Alloy", async () => {
  const key = "xtranslate_pro_tts_cache:" + JSON.stringify({ text: " shortage ", lang: "en", voice: "" });
  records[key] = {
    data: "data:audio/mpeg;base64," + Buffer.from(mp3Bytes).toString("base64"),
    type: "audio/mpeg", expiresAt: Date.now() + 60_000, updatedAt: Date.now(),
  };
  const restored = await provider.getAudioFile("shortage", "auto", XTranslateProTTSVoice.Alloy);
  expect(new Uint8Array(await restored.arrayBuffer())).toEqual(mp3Bytes);
  expect(mockFetchBlob).not.toHaveBeenCalled();
  await provider.getAudioFile("shortage", "en");
  expect(mockFetchBlob).toHaveBeenCalledTimes(1);
});
