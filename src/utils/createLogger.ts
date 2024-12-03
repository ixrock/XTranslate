// Basic logger for outputting system logs to console or other source
import { isDevelopment } from "../common-vars";

export interface CreateLoggerOptions {
  systemPrefix?: string; // system part logger with own prefix
}

export interface Logger {
  info(...args: any[]): void
  error(...args: any[]): void
  time: (label: string) => {
    start(): void;
    stop(): void;
  }
}

export function createLogger({ systemPrefix = "[APP]" }: CreateLoggerOptions = {}): Logger {
  const prefix = `${systemPrefix}:`;

  if (!isDevelopment) {
    const noop = Function; // logs are provided only in `development` mode
    return {
      error: noop,
      info: noop,
      time: (label: string) => ({ start: noop, stop: noop })
    }
  }

  return {
    info(...args) {
      console.info(`%c ${prefix}`, "color: #942486; font-weight: bold;", ...args);
    },
    error(...args) {
      console.error(`%c ${prefix}`, "color: red; font-weight: bold;", ...args);
    },
    time(label: string) {
      label = `Time (${label})`;
      return {
        start() {
          console.time(label);
        },
        stop() {
          console.timeEnd(label);
        },
      }
    }
  }
}
