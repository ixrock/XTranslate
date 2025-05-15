XTranslate
==========
Chrome-extension for translating foreign languages at the viewing web-page context.
Translate from 100+ foreign languages to your native directly on web-site you're reading or
insert text in the action window (via extension's icon on chrome's toolbar).

![Screenshot](https://github.com/ixrock/XTranslate/blob/master/screenshots/Untitled-1.jpg?raw=true)

Features:
-----------
1) Many ways to get translation from texts within web page:
- double-click on the word

Select text and get translation right after one of the following actions:
- press hotkey defined in extension settings (`Alt + Shift + X` by default)
- click on the XTranslate icon appeared near selected text
- release mouse button after selecting a text (this option is turned off by default)
- write text in the input fields, mouse-over it and press hotkey
- open extension's window while text selected to get translation

You can get even some translation from images by mouse overing the image element and
press hotkey (title or alt attributes will be used when applicable).
With this feature it is possible to get auto-translation by block of text at the page
just by pressing the hotkey when mouse over it!

1) Translate texts in **PDF** files _(disabled by default)_.\
This option will replace default chrome-based PDF-viewer and might not work correctly due [CORS](https://developer.mozilla.org/en-US/docs/Glossary/CORS) sometimes.

In order to work with local files (e.g. `file://path/to/file.pdf`) you must allow access for the extension:
- open extensions page `chrome://extensions/`, find **XTranslate** and click **(Details)** button
- enable checkbox **"Allow access to file URLs"** 

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
* [Firefox addons](https://addons.mozilla.org/en-GB/firefox/addon/xtranslate-chrome/) _(might be not fully supported)_

Available translation providers:
-----------
* [Google](http://translate.google.com/)
* [Yandex](http://translate.yandex.com/)
* [Bing](http://bing.com/translator/)
* [DeepL](https://www.deepl.com/) _(requires own user key, register at https://www.deepl.com/en/signup/)_
* [DeepSeek](https://platform.deepseek.com) _(register, top-up balance and create api-key)_
* [OpenAI (ChatGPT)](https://platform.openai.com) _(see registration steps below)_
* [Grok](https://grok.com) _(create account at https://console.x.ai, top-up balance and provide api-key)_

Steps for access OpenAI translations:
------
1) [Sign up](https://platform.openai.com/signup) if not yet registered or go to [OpenAI platform settings](https://platform.openai.com/settings) 
2) Create api access key to get access for OpenAI translation service results 
3) Top-up your balance (5$+) and disable credit card's auto-top-up balance at [billing page](https://platform.openai.com/settings/organization/billing/overview) _(recommended)_
4) Don't forget to adjust [limits settings](https://platform.openai.com/settings/organization/limits) _(recommended)_

Security considerations:
------
- OpenAI api key handled via extension-scoped [chrome.storage.local](https://developer.chrome.com/docs/extensions/reference/api/storage) apis
and used only within `Authorization` header to sign OpenAI API requests (which is not exposed or tracked, even if `webRequest` API enabled in some other malicious extension, [see excluded list of headers](https://developer.chrome.com/docs/extensions/reference/api/webRequest#concepts_and_usage))
- OpenAI requests goes through official [openai](https://www.npmjs.com/package/openai) NPM-package and running only within background service-worker (`{dangerouslyAllowBrowser: false}`)
- Don't enter or share your OpenAI key anywhere else except extension's settings page (options page)

For developers and contributors:
-----------

Install globals _(prerequisites)_:
1) node.js _(v.20+)_
2) npm install _(from project root folder)_

Steps to **build** (compile) extension:

1) `npm run build`
2) use `/dist` folder as extension's build source with own `manifest.json`

Other commands to **dev** and **test**:

1) `npm run dev` - runs project in dev/watch mode
2) `npm run test` - runs available jest tests

Powered by typescript, react, mobx, webpack, sass, lodash and some others. Made with ♥
