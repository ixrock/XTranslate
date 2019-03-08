import { ITranslationResult, Translator } from "./translator";
import { encodeQuery } from "../utils";
import groupBy from "lodash/groupBy";

class Bing extends Translator {
  public name = 'bing';
  public title = 'Bing';
  public apiUrl = 'https://www.bing.com';
  public publicUrl = `${this.apiUrl}/translator`;
  public textInputMaxLength = 5000;

  constructor() {
    super(require("./bing.json"))
  }

  refreshCookie() {
    console.log('refreshing cookies..');
    return fetch(this.publicUrl, { credentials: 'include' });
  }

  getAudioUrl(lang, text) {
    var locale = lang;
    var textEncoded = encodeURIComponent(text);
    if (lang === "en") locale = "en-US"
    return this.apiUrl + `/tspeak?text=${textEncoded}&` + encodeQuery({
      language: locale,
      format: this.ttsFormat,
      options: "male",
    });
  }

  protected translate(langFrom, langTo, text): Promise<ITranslationResult> {
    var reqInitBase: RequestInit = {
      method: 'post',
      credentials: 'include',
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      }
    }

    var detectLangReq = (): Promise<string> => {
      var url = this.apiUrl + "/tdetect";
      return fetch(url, {
        ...reqInitBase,
        body: encodeQuery({ text }),
      }).then(res => res.text());
    }

    var translationReq = (langFrom: string): Promise<BingTranslation> => {
      var url = this.apiUrl + "/ttranslate";
      return fetch(url, {
        ...reqInitBase,
        body: encodeQuery({ from: langFrom, to: langTo, text }),
      }).then(this.parseJson);
    };

    var dictReq = (langFrom: string): Promise<BingDictionary> => {
      var url = this.apiUrl + '/ttranslationlookup';
      return fetch(url, {
        ...reqInitBase,
        body: encodeQuery({ from: langFrom, to: langTo, text: text }),
      }).then(this.parseJson);
    };

    var refreshCookie = false;
    var request = async () => {
      try {
        var langDetected = langFrom === "auto" ? await detectLangReq() : langFrom;
        var [transRes, dictRes] = await Promise.all([
          translationReq(langDetected),
          dictReq(langDetected).catch(() => null)
        ]);
        var response: ITranslationResult = {
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
      } catch (error) {
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

const bing = new Bing();
Translator.registerVendor(bing.name, bing);
