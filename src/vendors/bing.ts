import { parseJson, Translation, TranslationError, Vendor } from "./vendor";
import { encodeQuery } from "../utils/encodeQuery";

class Bing extends Vendor {
  public name = 'bing';
  public title = 'Bing';
  public url = 'https://www.bing.com/translator';
  public publicUrl = this.url;
  public maxTextInputLength = 5000;

  refreshCookie() {
    console.log('refreshing cookies..');
    return fetch(this.url, { credentials: 'include' });
  }

  getAudioUrl(lang, text) {
    var locale = [lang, lang === 'en' ? 'US' : lang.toUpperCase()].join('-');
    return this.url + `/api/language/Speak?gender=male&media=${this.ttsFormat}&text=${text}&locale=${locale}`;
  }

  protected translate(langFrom, langTo, text): Promise<Translation> {
    var translationReq = (): Promise<BingTranslation> => {
      var url = this.url + '/api/Translate/TranslateArray?' +
        encodeQuery({
          from: langFrom === 'auto' ? '-' : langFrom,
          to: langTo
        });
      return fetch(url, {
        method: 'post',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([{ text: text }]),
      }).then(parseJson);
    };

    var dictReq = (from = langFrom, to = langTo): Promise<BingDictionary> => {
      var url = this.url + '/api/Dictionary/Lookup?' + encodeQuery({ from, to, text });
      return fetch(url, { credentials: 'include' }).then(parseJson);
    };

    var refreshCookie = false;
    var request = () => {
      return translationReq()
        .then(translationRes => {
          var translation: Translation = {
            langDetected: translationRes.from,
            translation: translationRes.items.map(tr => tr.text).join(" "),
            dictionary: []
          };
          return dictReq(translation.langDetected).then(dictRes => {
            translation.dictionary = dictRes.items.map(items => {
              return {
                wordType: items[0].posTag.toLowerCase(),
                meanings: items.map(item => {
                  return {
                    word: item.displayTarget,
                    translation: item.backTranslations.map(item => item.displayText),
                  }
                })
              }
            });
            return translation;
          }).catch(() => translation);
        })
        .catch((error: TranslationError) => {
          if (error.status === 403 && !refreshCookie) {
            refreshCookie = true;
            return this.refreshCookie().then(request);
          }
          throw error;
        });
    };

    return request();
  }
}

interface BingTranslation {
  from: string
  to: string
  items: { text: string }[]
}

interface BingDictionary {
  from: string
  to: string
  normalizedSource: string
  originalText: string
  displaySource: string
  items: {
    posTag: string
    displayTarget: string
    normalizedTarget: string
    backTranslations: {
      displayText: string
      normalizedText: string
    }[]
  }[][]
}

const params = require('./bing.json');
export const bing = new Bing(params);