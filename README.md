XTranslate
==========
Chrome-extension for translating foreign languages at page context.
Translate from 100+ foreign languages to your native directly on web-site you're reading or 
put text in the extension's drop-down window.

![Screenshot](https://github.com/ixrock/XTranslate/blob/master/screenshots/Untitled-1.jpg?raw=true)

Features:
-----------
1) Many ways to get translation from texts within web page:
- double-click on the word

select text and get translation right after one of the following actions:
- press hotkey defined in extension settings (**alt+shift+x** by default)
- click on the translate icon appeared near selected text
- release mouse button after selecting a text (this option is turned off by default)
- write text in the input fields, mouse-over it and press hotkey

You can get even some translation from images by mouse overing the image element and 
press hotkey (title or alt attributes will be used when applicable).
Even more, with this feature it is possible to get auto-translation by block of text at the page 
just by pressing the hotkey when mouse over it!

Translations in **PDF files** are also supported, but it works only from context menu due technical restrictions of how chrome renders pdf-files.
Select a text in opened file (be sure it's not an image file inside pdf content),  
then click mouse right button on selection and choose an to translate text from context menu.

2) Listen text-to-speech for all supported translation vendors

3) Create your unique design (theme) for the popup with translation results

4) Customize ways of getting translation and other options in app's settings

5) Insert any text in the app's "translate" tab (**alt+x** by default) and get translation of sentences or words with dictionary support

6) Save your favorite directions with preferred translation services as bookmarks for quick access

7) History of translations

Install extension:
-----------
* [Chrome's web store](https://chrome.google.com/webstore/detail/xtranslate/gfgpkepllngchpmcippidfhmbhlljhoo)
* [Opera's installer from chrome store](https://addons.opera.com/en/extensions/details/download-chrome-extension-9/?display=en)

Available translation vendors:
-----------
* [Google](http://translate.google.com/)
* [Yandex](http://translate.yandex.com/)
* [Bing](http://bing.com/translator/)

Powered by typescript, react, mobx, webpack, sass, lodash and some others. Made with ♥
