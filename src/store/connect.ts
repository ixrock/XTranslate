// Helper for connecting redux store with react components

import { connect as connectRedux } from 'react-redux'
import { IAppState } from "./store.types";

export function connect(mapStateToProps?: (store: IAppState) => any, options = { pure: true }) {
  // Workaround for allowing usage @connect() as decorator
  // Issue: https://github.com/Microsoft/TypeScript/issues/9365
  return target => (connectRedux(mapStateToProps, null, null, options)(target) as any);
}
