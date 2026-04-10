import { MessageType, ProxyStreamErrorMessage, ProxyStreamHeadersMessage, ProxyStreamPayload, ProxyStreamResponsePayload } from "./messages";

export interface ProxyStreamHandlers {
  onHeaders?(message: ProxyStreamHeadersMessage): void;
  onChunk?(chunk: Uint8Array): void;
  onDone?(): void;
  onError?(message: ProxyStreamErrorMessage): void;
  onDisconnect?(initiatedByClient: boolean): void;
}

export interface ProxyStreamConnection {
  port: chrome.runtime.Port;
  disconnect(): void;
}

export function openProxyStream(payload: ProxyStreamPayload, handlers: ProxyStreamHandlers = {}): ProxyStreamConnection {
  const port = chrome.runtime.connect({
    name: MessageType.HTTP_PROXY_STREAM,
  });
  let initiatedByClient = false;

  const onMessage = (message: ProxyStreamResponsePayload) => {
    if ("headers" in message) {
      handlers.onHeaders?.(message);
      return;
    }

    if ("chunk" in message) {
      handlers.onChunk?.(new Uint8Array(message.chunk));
      return;
    }

    if ("error" in message) {
      handlers.onError?.(message);
      return;
    }

    if ("done" in message) {
      handlers.onDone?.();
    }
  };

  const onDisconnect = () => {
    port.onMessage.removeListener(onMessage);
    port.onDisconnect.removeListener(onDisconnect);
    handlers.onDisconnect?.(initiatedByClient);
  };

  port.onMessage.addListener(onMessage);
  port.onDisconnect.addListener(onDisconnect);

  try {
    port.postMessage(payload);
  } catch (error) {
    handlers.onError?.({
      error: error instanceof Error ? error.message : String(error),
    });
    initiatedByClient = true;
    try {
      port.disconnect();
    } catch {
      /* noop */
    }
  }

  return {
    port,
    disconnect() {
      initiatedByClient = true;
      try {
        port.disconnect();
      } catch {
        /* noop */
      }
    },
  };
}
