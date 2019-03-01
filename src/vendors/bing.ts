import { parseJson, Translation, Vendor } from "./vendor";
import { encodeQuery } from "../utils";
import { groupBy } from "lodash";

class Bing extends Vendor {
  public name = 'bing';
  public title = 'Bing';
  public url = 'https://www.bing.com';
  public publicUrl = `${this.url}/translator`;
  public maxTextInputLength = 5000;

  refreshCookie() {
    console.log('refreshing cookies..');
    return fetch(this.publicUrl, { credentials: 'include' });
  }

  getAudioUrl(lang, text) {
    var locale = lang;
    var textEncoded = encodeURIComponent(text);
    if (lang === "en") locale = "en-US"
    return this.url + `/tspeak?text=${textEncoded}&` + encodeQuery({
      language: locale,
      format: this.ttsFormat,
      options: "male",
    });
  }

  protected translate(langFrom, langTo, text): Promise<Translation> {
    var reqInitBase: RequestInit = {
      method: 'post',
      credentials: 'include',
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      }
    }

    var detectLangReq = (): Promise<string> => {
      var url = this.url + "/tdetect";
      return fetch(url, {
        ...reqInitBase,
        body: encodeQuery({ text }),
      }).then(res => res.text());
    }

    var translationReq = (langFrom: string): Promise<BingTranslation> => {
      var url = this.url + "/ttranslate";
      return fetch(url, {
        ...reqInitBase,
        body: encodeQuery({ from: langFrom, to: langTo, text }),
      }).then(parseJson);
    };

    var dictReq = (langFrom: string): Promise<BingDictionary> => {
      var url = this.url + '/ttranslationlookup';
      return fetch(url, {
        ...reqInitBase,
        body: encodeQuery({ from: langFrom, to: langTo, text: text }),
      }).then(parseJson);
    };

    var refreshCookie = false;
    var request = async (): Promise<Translation> => {
      try {
        var langDetected = langFrom === "auto" ? await detectLangReq() : langFrom;
        var [transRes, dictRes] = await Promise.all([
          translationReq(langDetected),
          dictReq(langDetected).catch(() => null)
        ]);
        var response: Translation = {
          langDetected: langDetected,
          translation: transRes.translationResponse,
          dictionary: []
        };
        if (dictRes) {
          var dictGroups = groupBy<DictTranslation>(dictRes.translations, trans => trans.posTag)
          response.dictionary = Object.keys(dictGroups).map(wordType => {
            return {
              wordType: wordType.toLowerCase(),
              meanings: dictGroups[wordType].map(trans => {
                return {
                  word: trans.displayTarget,
                  translation: trans.backTranslations.map(item => item.displayText),
                }
              })
            }
          });
        }
        return response;
      }
      catch (error) {
        if (!refreshCookie) {
          refreshCookie = true;
          return this.refreshCookie().then(request);
        }
        throw error;
      }
    };
    return request();
  }
}

interface BingTranslation {
  statusCode: number
  translationResponse: string
}

interface BingDictionary {
  normalizedSource: string
  displaySource: string
  translations: DictTranslation[]
}

interface DictTranslation {
  posTag: string
  displayTarget: string
  normalizedTarget: string
  prefixWord: string
  confidence: number
  backTranslations: {
    displayText: string
    normalizedText: string
    numExamples: number
    frequencyCount: number
  }[]
}

const params = require('./bing.json');
export const bing = new Bing(params);