XTranslate
==========
Chrome-extension for translating foreign languages at the viewing web page context.
Translate from 100+ foreign languages to your native directly on web-site you're reading or 
insert text in the action window (via extension's icon on chrome's toolbar).

![Screenshot](https://github.com/ixrock/XTranslate/blob/master/screenshots/Untitled-1.jpg?raw=true)

Features:
-----------
1) Many ways to get translation from texts within web page:
- double-click on the word

select text and get translation right after one of the following actions:
- press hotkey defined in extension settings (`Alt + Shift + X` by default)
- click on the XTranslate icon appeared near selected text
- release mouse button after selecting a text (this option is turned off by default)
- write text in the input fields, mouse-over it and press hotkey
- open extension's window while text selected to get translation

You can get even some translation from images by mouse overing the image element and 
press hotkey (title or alt attributes will be used when applicable).
With this feature it is possible to get auto-translation by block of text at the page 
just by pressing the hotkey when mouse over it!

Translations in **PDF files** are also supported, but it works only from context menu (turned off by default in the settings) 
due technical restrictions of how chrome renders PDF-files.
Select a text in opened file (be sure it's not an image file inside pdf content),  
then click mouse right button on the selection and choose "XTranslate -> Translate with ..." from the menu.

2) Listen text-to-speech (TTS) for all supported translation vendors

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
* [Firefox addons](https://addons.mozilla.org/en-GB/firefox/addon/xtranslate-chrome/)

Available translation vendors:
-----------
* [Google](http://translate.google.com/)
* [Yandex](http://translate.yandex.com/)
* [Bing](http://bing.com/translator/)
* [DeepL](https://www.deepl.com/)

For developers and contributors:
-----------

Install globals _(prerequisites)_:
1) node _(>=16 && <=18)_
2) brew install yarn

3) yarn _(from project root, install all dependencies)_

Steps to **build** (compile) extension:

1) `npm run build`
2) see `/dist` and `/dist-firefox` (depends on the branch) folder(s) for ready-to use extension source directory with own `manifest.json`

Other commands to **dev** and **test**:

1) `npm run dev` - runs project in dev/watch mode
2) `npm run test` - runs available jest tests

Powered by typescript, react, mobx, webpack, sass, lodash and some others. Made with ♥
