import { isProduction } from "./common";

export const logger = {
  settings: {
    withTime: true,
  },

  _getPrefix(): any[] {
    var { withTime } = this.settings;
    var data = []
    if (withTime) {
      data.push(new Date().toLocaleTimeString());
    }
    return data;
  },

  debug(...data: any[]) {
    if (isProduction) return;
    console.log(...[this._getPrefix(), data].flat());
  },

  error(...data: any[]) {
    console.error(...[this._getPrefix(), data].flat());
  }
}
