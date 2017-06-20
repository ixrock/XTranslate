// Basic template parser (e.g "Hello, {user}!")
import * as React from "react";

interface IPlaceholders {
  [paramName: string]: string | number | React.ReactNode
}

const paramMatcher = /{(.*?)}/;

export function parseTemplate(template: string, placeholders: IPlaceholders) {
  var search = template;
  var output = [];
  var hasReactNodes = false;
  var matcher: RegExpMatchArray;

  while (matcher = search.match(paramMatcher)) {
    var [placeholder, param] = matcher;
    var value = placeholders[param];
    var index = matcher.index;

    output.push(search.substr(0, index), value);
    search = search.substr(index + placeholder.length);

    if (!hasReactNodes && React.isValidElement(value)) {
      hasReactNodes = true;
    }
  }

  if (search) output.push(search); // add tail if any
  if (!output.length) output.push(template);
  return hasReactNodes ? React.Children.toArray(output) : output.join("");
}
