// Basic logger for outputting system logs to console or other source
import { isProduction } from "../common";

export interface CreateLoggerOptions {
  systemPrefix?: string; // system part logger with own prefix
  outputSource?: Logger; // logger instance, default: global.console
}

export interface Logger {
  info(...data: any[]): void,
  error(...data: any[]): void
}

export function createLogger({ systemPrefix = "app", outputSource = console }: CreateLoggerOptions): Logger {
  const prefix = systemPrefix.toUpperCase() + `:`;
  const console = Object.create(outputSource) as typeof outputSource;

  // logs are shown only in development/debug mode
  if (isProduction) {
    console.info = Function;
    console.error = Function;
  } else {
    console.info = console.info.bind(console, prefix);
    console.error = console.error.bind(console, prefix);
  }

  return console;
}
