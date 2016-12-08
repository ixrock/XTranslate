// Chrome extension's localization api helper

interface Localization {
  (messageId: string): string;
  (messageId: string, replacers?: PlaceholderReplacer[]): any[];
}

export const __i18n: Localization = function (messageId, replacers?): any {
  var message = chrome.i18n.getMessage(messageId);
  if (!replacers) return message;
  return processMessage(message, replacers);
};

export type PlaceholderReplacer = ((placeholder: string) => any) | any;

// process placeholders %any text inside message% from localization files
const placeholderMatcher = /%(.*?)%/;
function processMessage(message: string, replacers: PlaceholderReplacer[] = [], result = []) {
  var match = message.match(placeholderMatcher);
  if (match) {
    var index = match.index;
    var before = message.substr(0, index);
    if (before) result.push(before); // add part before match
    var replacer = replacers.shift();
    var isFunction = typeof replacer === "function";
    var substr = isFunction ? replacer(match[1]) : replacer != null ? replacer : match[1];
    result.push(substr); // add processed sub-string to end result
    processMessage(message.substr(index + match[0].length), replacers, result); // replace rest part of message
  } else {
    result.push(message); // just put rest of the message if no matches found
  }
  return result;
}