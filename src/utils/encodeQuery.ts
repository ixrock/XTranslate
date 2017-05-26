// Helper to encode URL query params

type Param = string|{[param: string]: any};

var encodeParam = function (key, value) {
  return key + '=' + encodeURIComponent(value)
};

export function encodeQuery(...params: Param[]): string {
  var query = [];
  params.forEach(param => {
    if (typeof param === 'string') query.push(param);
    else {
      Object.keys(param).map(key => {
        var value = param[key];
        if (value == null) return;
        if (Array.isArray(value)) query.push(...value.map(value => encodeParam(key, value)));
        else query.push(encodeParam(key, value));
      })
    }
  });
  return query.join('&');
}
