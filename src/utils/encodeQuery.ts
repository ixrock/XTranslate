// Helper to encode URL query params

type Param = string|{[param: string]: any};

export function encodeQuery(...params: Param[]): string {
  var query = [];
  params.forEach(param => {
    if (typeof param === 'string') query.push(param);
    else {
      query.push(Object.keys(param).map(key => {
        return key + '=' + encodeURIComponent(String(param[key]));
      }).join('&'))
    }
  });
  return query.join('&');
}

export default encodeQuery;