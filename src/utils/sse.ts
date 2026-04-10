export interface SSEMessage {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

export class SSEParser {
  private buffer = "";
  private currentEvent = "message";
  private currentData: string[] = [];
  private currentId?: string;
  private currentRetry?: number;

  feed(chunk: string): SSEMessage[] {
    this.buffer += chunk;

    const events: SSEMessage[] = [];
    let lineBreakIndex = this.buffer.indexOf("\n");

    while (lineBreakIndex >= 0) {
      let line = this.buffer.slice(0, lineBreakIndex);
      this.buffer = this.buffer.slice(lineBreakIndex + 1);

      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      if (!line) {
        const event = this.dispatchEvent();
        if (event) {
          events.push(event);
        }
      } else if (!line.startsWith(":")) {
        this.processLine(line);
      }

      lineBreakIndex = this.buffer.indexOf("\n");
    }

    return events;
  }

  flush(): SSEMessage[] {
    if (this.buffer) {
      const trailingEvents = this.feed("\n");
      if (trailingEvents.length) {
        return trailingEvents;
      }
    }

    const event = this.dispatchEvent();
    return event ? [event] : [];
  }

  private processLine(line: string) {
    const separatorIndex = line.indexOf(":");
    const field = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
    let value = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : "";

    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    switch (field) {
    case "event":
      this.currentEvent = value || "message";
      break;

    case "data":
      this.currentData.push(value);
      break;

    case "id":
      this.currentId = value;
      break;

    case "retry": {
      const retryValue = Number.parseInt(value, 10);
      if (!Number.isNaN(retryValue)) {
        this.currentRetry = retryValue;
      }
      break;
    }
    }
  }

  private dispatchEvent(): SSEMessage | undefined {
    if (!this.currentData.length) {
      this.resetEventState();
      return;
    }

    const event: SSEMessage = {
      event: this.currentEvent || "message",
      data: this.currentData.join("\n"),
    };

    if (this.currentId !== undefined) {
      event.id = this.currentId;
    }
    if (this.currentRetry !== undefined) {
      event.retry = this.currentRetry;
    }

    this.resetEventState();
    return event;
  }

  private resetEventState() {
    this.currentEvent = "message";
    this.currentData = [];
    this.currentId = undefined;
    this.currentRetry = undefined;
  }
}
