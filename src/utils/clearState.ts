// Helper for resetting actual keys in the React's state object
import omit = require('lodash/omit');

export function clearState<S>(state: S, omitKeys: string[] = []): S {
  return Object.keys(omit(state, omitKeys)).reduce((state, prop) => {
    state[prop] = null;
    return state;
  }, {} as any);
}
