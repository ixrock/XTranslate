// Helper for combining css classes inside components
export type IClassName = string | string[] | { [className: string]: boolean | any };

export function cssNames(...args: IClassName[]): string {
  var map: { [name: string]: boolean } = {};
  var addName = (className: string) => map[className.trim()] = true;
  args.forEach(function (className) {
    if (typeof className === 'string') className = className.split(/\s+/g);
    if (Array.isArray(className)) className.forEach(addName);
    else if (typeof className === 'object') {
      // remove keys with undefined values
      Object.keys(className).forEach(function (name) {
        if (className[name] === undefined) delete className[name];
      });
      // merge to common list
      Object.assign(map, className);
    }
  });
  return Object.keys(map).filter((className) => !!map[className]).join(' ');
}
