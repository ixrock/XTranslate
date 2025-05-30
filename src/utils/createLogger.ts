// Basic logger for outputting system logs to console or other source
import { isDevelopment } from "../common-vars";

export enum LoggerColor {
  INFO_DEFAULT = "#ca22b5",
  INFO_SYSTEM = "#2b6afb",
}

export interface CreateLoggerOptions {
  prefixColor?: LoggerColor;
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

export function createLogger(
  {
    systemPrefix = "[APP]",
    prefixColor = LoggerColor.INFO_DEFAULT,
  }: CreateLoggerOptions = {}): Logger {
  const prefix = `${systemPrefix}:`;

  return {
    info(...args) {
      if (!isDevelopment) return;
      console.info(`%c ${prefix}`, `color: ${prefixColor}; font-weight: bold;`, ...args);
    },
    error(...args) {
      if (!isDevelopment) return;
      console.error(`%c ${prefix}`, "color: red; font-weight: bold;", ...args);
    },
    time(label: string) {
      label = `Time (${label})`;
      return {
        start() {
          if (!isDevelopment) return;
          console.time(label);
        },
        stop() {
          if (!isDevelopment) return;
          console.timeEnd(label);
        },
      }
    }
  }
}
