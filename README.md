XTranslate
==========
Chrome-based browser extension for translating languages.
Translate single words with dictionary support (Google/Bing) or even full-pages from 100+ foreign languages to your native language.

![Screenshot](https://github.com/ixrock/XTranslate/blob/master/screenshots/Untitled-1.jpg?raw=true)
See more screenshots [here](./screenshots/README.md).

Features:
-----------

1) Multiple ways to get translation from web-pages:

- full-page text translations: enable/disable auto-translation for full webpage from browser's context-menu or app's action window
- double-click on the word
- mouse-over a block of text and press hotkey defined at the extension settings (`Alt + Shift + X` by default), this works for input/textarea fields too!
- select a text at the webpage and click the XTranslate (X)-icon appeared close to the text
- just right after text selection _(this option is turned off by default)_
- click by selected text at the page _(this option is turned off by default)_
- open the app's action window (extension icon at browser's toolbar) and selected text from the page will be sent for translation

You can get even some translation from images by mouse overing the image element and
press hotkey (`title` or `alt` attributes will be used when applicable).

1) Translate texts in **PDF** files _(disabled by default)_.\
   This option will replace default browser's PDF-viewer and sometimes might not work correctly due [CORS](https://developer.mozilla.org/en-US/docs/Glossary/CORS).\
   Anyway, even when it's enabled you can re-open PDF document with default viewer by clicking special Chrome-logo icon at PDF's top toolbar.

2) Listen text-to-speech (TTS) for supported translation providers (e.g. `Google`, `OpenAI`)

3) Create your unique design (theme) for the popup with translation results

4) Customize ways of getting translation and other options in app's settings

5) Type any text in the app's action window and get translation with dictionary support for single words

6) Save your favorite language pairs (from -> to) as bookmarks for quick access
   (`Cmd/Alt + Shift + click` at the language list item to save and keep on top)

7) History of translations (turned off by default)

Install extension:
-----------

* [Chrome's Web Store](https://chrome.google.com/webstore/detail/xtranslate/gfgpkepllngchpmcippidfhmbhlljhoo)
* [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/cinfaflgbaachkaamaeglolofeahelkd)
* [Firefox addons](https://addons.mozilla.org/en-GB/firefox/addon/xtranslate-chrome/) _(very outdated version)_

Available translation providers:
-----------

* [Google](http://translate.google.com/) - ready to use after installation
* [Bing](http://bing.com/translator/) - ready to use after installation
* [OpenAI](https://platform.openai.com) _(register, top-up balance and create api-key for the extension)_
* [Grok](https://console.x.ai) _(register, top-up balance and create api-key)_
* [DeepSeek](https://platform.deepseek.com) _(register, top-up balance and create api-key)_
* [Gemini](https://aistudio.google.com/) _(create free-tier api-key)_

How to enable translator in local HTML/PDF files:
-----------
In order to work with local documents (e.g. `file://path/file.pdf`) you must allow access for the extension:

- open extensions page `chrome://extensions/`, find **XTranslate** and click _[Details]_ button
- enable checkbox **"Allow access to file URLs"**

XTranslate architecture overview:
-----------

* All parts are connected through the Service Worker.
* Isomorphic storage updated sequentially in Service Worker only: _say bye-bye to race-conditions_!
* Webpack build handles 3 different targets: `WebPageContentScript(target=web)`, `AppActionWindowScript(target=web)` and `BackgroundServiceWorker(target=worker)`.

```
┌─────── Web Page (Browser Tab) ────────────┐
│ Content Script                            │
│ — captures text selection                 │
│ — shows floating UI bubble (updates DOM)  │
└────────▲──────────────────────────────────┘
         │ messages channel / sync store
         ▼
┌─ Service Worker (aka Background Script) ──┐
│ — access to allowed chrome.api.*          │
│ — runtime messages hub                    │
│ — isomorphic storage (use in any env)     │
│ — api proxy (HTTP(S)/CSP/providers API)   │
│ — user metrics (GA)                       │
└────────▲──────────────────────────────────┘
         │ messages channgel / sync store
         ▼
┌─────────────── Action Window ─────────────┐
│ — settings page                           │
│ — popup theming and customization page    │
│ — text input                              │
│ — history page                            │
└───────────────────────────────────────────┘
```

How to build/contribute to project:
-----------

_Prerequisites:_

1) Install [Node.js](https://nodejs.org/) _(v24+)_
2) Install project dependencies `npm install`

_NPM-script commands:_

1) `npm run dev` - run project in development / watch mode
2) `npm run build` - compile and pack ready to use extension in `/dist`
3) `npm run test` - run available unit-tests

Powered by Typescript, ReactJS, MobX, Webpack, Scss, and some others. Made with ♥
