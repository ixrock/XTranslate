// Helper utilities

export const noop = () => null;
export const isMac = navigator.platform.startsWith("Mac");
export const isEdge = !!navigator.userAgent.match(/Edge?\//);

export * from './autobind'
export * from './cssNames'
export * from './createStorage'
export * from './parseHotkey'
export * from './encodeQuery'
export * from './prevDefault'
export * from './downloadFile'
export * from './eventEmitter'
export * from './toCssColor'
export * from './debouncePromise'
export * from './delay'
export * from './isReactNode'
