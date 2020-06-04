import { ITranslationResult, Translator } from "./translator";
import { encodeQuery } from "../utils";
import groupBy from "lodash/groupBy";

class Bing extends Translator {
  public name = 'bing';
  public title = 'Bing';
  public apiUrl = 'https://www.bing.com';
  public publicUrl = `${this.apiUrl}/translator`;
  public textMaxLength = 5000;

  constructor() {
    super(require("./bing.json"))
  }

  getFullPageTranslationUrl(pageUrl: string, lang: string): string {
    return `https://www.microsofttranslator.com/bv.aspx?to=${lang}&a=${pageUrl}`
  }

  refreshCookie() {
    console.log('refreshing cookies..');
    return fetch(this.publicUrl, { credentials: 'include' });
  }

  protected translate(langFrom, langTo, text): Promise<ITranslationResult> {
    var reqInitBase: RequestInit = {
      method: 'post',
      credentials: 'include',
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      }
    }

    var translationReq = (langFrom: string): Promise<BingTranslation[]> => {
      var url = this.apiUrl + "/ttranslatev3";
      return fetch(url, {
        ...reqInitBase,
        body: encodeQuery({
          fromLang: langFrom === "auto" ? "auto-detect" : langFrom,
          to: langTo,
          text: text
        }),
      }).then(this.parseJson);
    };

    var dictionaryReq = (langFrom: string): Promise<BingDictionary[]> => {
      var url = this.apiUrl + '/tlookupv3';
      return fetch(url, {
        ...reqInitBase,
        body: encodeQuery({ from: langFrom, to: langTo, text }),
      }).then(this.parseJson);
    };

    var refreshCookie = false;
    var request = async () => {
      try {
        // base translation results
        var transRes = await translationReq(langFrom);
        var { translations, detectedLanguage } = transRes[0];
        var result: ITranslationResult = {
          langDetected: detectedLanguage.language,
          translation: translations.length ? translations[0].text : "",
          dictionary: []
        };

        // dictionary results
        var dictRes = await dictionaryReq(result.langDetected).catch(() => null);
        if (dictRes) {
          var dictGroups = groupBy<DictTranslation>(dictRes[0].translations, trans => trans.posTag)
          result.dictionary = Object.keys(dictGroups).map(wordType => {
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
        return result;
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
  detectedLanguage: {
    language: string;
    score: number;
  }
  translations: {
    text: string;
    to: string;
  }[];
}

interface BingDictionary {
  displaySource: string
  normalizedSource: string
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
Translator.register(bing.name, bing);
