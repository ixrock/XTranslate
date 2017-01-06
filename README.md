XTranslate
==========
This is chrome-extension for translating languages.
Translate from 100+ foreign languages to your native directly on web-site you're reading or 
put text in the extension's drop-down window.

<img src="https://camo.githubusercontent.com/282bf65c94b4e198171440f7a43c088fe1c8324e/68747470733a2f2f646c2e64726f70626f7875736572636f6e74656e742e636f6d2f752f36313430353737332f787472616e736c6174652f556e7469746c65642d312e6a7067">

Features:
-----------
1) There are many ways of getting translation from texts the page:
- double-click on the word

select text and get immediate translation after one of the following actions:
- press hotkey defined in extension settings (**alt+x** by default)
- click on the translate icon appeared near selected text
- just release mouse left button (turned off by default)
- write text in input fields, mouse over it and press hotkey

You can get even some information from images by putting mouse cursor over the image element and 
press hotkey (title or alt attributes will be used, if applicable).
Even more, with this feature is possible to get auto-selection of text from element under mouse cursor.
Just move the pointer to element on the page and press hotkey!

Translations in **PDF files** are also supported, but it works only from context menu due technical restrictions of how chrome renders pdf-files.
Select a text in opened file (be sure it's not an image file inside pdf content),  
then do mouse right click on selection and choose an item to get translation with specific translation vendor.

2) Listen text-to-speech for all supported translation vendors

3) Create your unique design (theme) for the popup with translation

4) Customize ways of getting translation and other options in the settings

5) Insert any text in the extension's drop-down window and get translation of sentences or words with dictionary support

6) Save your favorite language directions with specific vendor as bookmarks for quick access

7) View and edit history of translations (*coming soon*)

Install extension:
-----------
* [Chrome's web store](https://chrome.google.com/webstore/detail/xtranslate/gfgpkepllngchpmcippidfhmbhlljhoo)
* [Opera's installer from chrome store](https://addons.opera.com/en/extensions/details/download-chrome-extension-9/?display=en)

Available translation vendors:
-----------
* [Google](http://translate.google.com/)
* [Yandex](http://translate.yandex.com/)
* [Bing](http://bing.com/translator/)

Powered by typescript, react, redux, webpack, sass, lodash and some others. Made with ♥
