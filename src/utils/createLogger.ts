// Basic logger for outputting system logs to console or other source
import { isProduction } from "../common-vars";

export interface CreateLoggerOptions {
  systemPrefix?: string; // system part logger with own prefix
  outputSource?: Logger; // logger instance, default: global.console
}

export interface Logger {
  info(...data: any[]): void,
  error(...data: any[]): void
}

export function createLogger({ systemPrefix = "[APP]", outputSource = console }: CreateLoggerOptions = {}): Logger {
  const prefix = systemPrefix + `:`;
  const console = Object.create(outputSource) as typeof outputSource;

  // logs are shown only in development/debug mode
  if (isProduction) {
    console.info = () => null;
    console.error = () => null;
  } else {
    console.info = console.info.bind(console, prefix);
    console.error = console.error.bind(console, prefix);
  }

  return console;
}
