import { SSEParser } from "./sse";

describe("utils/sse", () => {
  it("parses chunked server-sent events", () => {
    const parser = new SSEParser();

    const firstChunk = parser.feed("event: job_started\ndata: {\"requestId\":\"req_1\"");
    const secondChunk = parser.feed("}\n\nevent: batch_done\ndata: {\"batchIndex\":0}\n\n");

    expect(firstChunk).toEqual([]);
    expect(secondChunk).toEqual([
      {
        event: "job_started",
        data: "{\"requestId\":\"req_1\"}",
      },
      {
        event: "batch_done",
        data: "{\"batchIndex\":0}",
      },
    ]);
  });

  it("supports multi-line data payloads and flush", () => {
    const parser = new SSEParser();

    parser.feed("event: batch_done\ndata: first line\ndata: second line");

    expect(parser.flush()).toEqual([
      {
        event: "batch_done",
        data: "first line\nsecond line",
      },
    ]);
  });

  it("ignores comments and preserves id/retry metadata", () => {
    const parser = new SSEParser();

    const events = parser.feed(": keepalive\nid: evt_1\nretry: 1500\ndata: payload\n\n");

    expect(events).toEqual([
      {
        event: "message",
        data: "payload",
        id: "evt_1",
        retry: 1500,
      },
    ]);
  });
});
