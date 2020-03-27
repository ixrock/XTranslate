// Helper for combining css classes inside components

export type IClassName = string | string[] | IClassNameMap;
export type IClassNameMap = Record<string, boolean | any>;

export function cssNames(...args: IClassName[]): string {
  var map: IClassNameMap = {};
  args.forEach(className => {
    if (typeof className === "string" || Array.isArray(className)) {
      [].concat(className).forEach(name => map[name] = true);
    }
    else {
      Object.assign(map, className);
    }
  });
  return Object.entries(map)
    .filter(([className, isActive]) => !!isActive)
    .map(([className]) => className.trim())
    .join(' ');
}
