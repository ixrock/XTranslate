// Content script injector
import * as env from '../env'
import { getURL } from '../extension'

// refresh content script every time on page reload
if (env.isDevelopment) {
  window.fetch(getURL('content.js')).then(res => res.text()).then(eval);
}

// attach full source code in build
if (env.isProduction) {
  require('./user-script');
}