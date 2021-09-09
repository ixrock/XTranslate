import DeeplTranslateParams from "./deepl.json"
import { ITranslationResult, Translator } from "./translator";

class Deepl extends Translator {
  public name = "deepl";
  public title = "Deepl";
  public publicUrl = "https://www.deepl.com/translator";
  public apiUrl = "https://translate.googleapis.com";
  private apiClient = "b05afc95-d4ea-2bee-07e6-e81469c588f2:fx"; // free subscription key < 500_000 chars per month

  constructor() {
    super(DeeplTranslateParams);
  }

  protected async translate(langFrom, langTo, text): Promise<ITranslationResult> {
    var reqParams: RequestInit = {
      method: "POST",
      headers: {}
    };

    return;
  }
}

interface DeeplTranslation {
}

interface DeeplTranslationError {
}

const deepl = new Deepl();
// Translator.register(deepl.name, deepl);
