// Make enum values unique

export function enumUniq(obj) {
  Object.keys(obj).forEach(function (key) {
    if (isNaN(+key)) {
      var s = Object(Symbol(key));
      s.toString = () => key;
      obj[key] = s;
    }
  });
  return obj;
}

export default enumUniq;