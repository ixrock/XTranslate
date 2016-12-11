// Content script injector
import * as env from '../env'
import { getURL } from '../extension'

// refresh files every time on page reload
if (env.isDevelopment) {
  // css
  var style = document.createElement('link');
  style.rel = "stylesheet";
  style.href = getURL('page.css');
  document.head.appendChild(style);
  // js
  window.fetch(getURL('content.js')).then(res => res.text()).then(eval);
}

// attach full source code in build
if (env.isProduction) {
  require('./user-script');
}