// Helper for preventing default event action and performing custom callback

export function prevDefault(callback: (evt) => void) {
  return function (evt: React.SyntheticEvent<any>) {
    evt.preventDefault();
    evt.stopPropagation();
    return callback(evt);
  }
}

export default prevDefault;
