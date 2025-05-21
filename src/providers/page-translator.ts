import { reaction } from "mobx";
import { franc } from "franc";
import { autoBind, disposer, sha256Hex, createLogger } from "../utils";
import { ProviderCodeName } from "./providers";
import type { TranslateParams } from "./translator";
import { settingsStore } from "../components/settings/settings.storage";

export type LangSource = string;
export type LangTarget = string;
export type TranslatorParamsHashId = `${ProviderCodeName}_${LangSource}_${LangTarget}`;

export interface PageTranslatorParams {
}

export class PageTranslator {
  static readonly RX_LETTER = /\p{L}/u;
  static readonly SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);
  static readonly API_MAX_CHARS_LIMIT_PER_REQUEST = 5000;

  private textNodes = new Set<Node>();
  private translations: Map<TranslatorParamsHashId, WeakMap<Node, string/*translation*/>> = new Map();
  private detectedLanguages = new WeakMap<Node, string>();
  protected logger = createLogger({ systemPrefix: "[PAGE-TRANSLATOR]" });
  protected dispose = disposer();

  constructor(private params: PageTranslatorParams = {}) {
    autoBind(this);
  }

  getSettingsParams() {
    const { provider, langFrom, langTo } = settingsStore.data.fullPageTranslation;
    return { provider, langFrom, langTo };
  }

  getHashId(params = this.getSettingsParams()): TranslatorParamsHashId {
    const { provider, langFrom, langTo } = params;
    return `${provider}_${langFrom}_${langTo}`;
  }

  getSettingsHashIdParams() {
    return this.getHashId(this.getSettingsParams());
  }

  startAutoTranslation() {
    const textNodes = this.collectPageTextsNodes();
    this.processNodes(textNodes);

    this.dispose.push(
      reaction(this.getSettingsParams, this.refreshTranslations, { delay: 250 }),
      this.watchNewDOMTextNodes(),
    );

    return () => {
      this.textNodes.clear();
      this.dispose();
    }
  }

  private async refreshTranslations() {
    return Promise.allSettled(
      Array.from(this.textNodes).map(this.translateNode)
    )
  };

  private processNodes(textNodes: Node[]) {
    const limit = PageTranslator.API_MAX_CHARS_LIMIT_PER_REQUEST;
    const packs: Node[][] = [];

    let bufferLen = 0; // in code-points
    let current: Node[] = [];

    const freshNodes = textNodes.filter(n => !this.textNodes.has(n));

    for (const node of freshNodes) {
      const txt = node.nodeValue ?? "";
      const len = [...txt].length; // safe for chars like: 😊 𐍈 等

      this.textNodes.add(node);

      if (bufferLen + len > limit) {
        if (current.length) packs.push(current);
        current = [];
        bufferLen = 0;
      }
      current.push(node);
      bufferLen += len;
    }

    if (current.length) {
      packs.push(current); // add tail (if any)
    }

    // TODO: send to translation API by text-groups
    const textGroups = packs.map(nodes => nodes.map(node => node.nodeValue));
    console.log(`[PROCESS-NODES-PACK]: ${packs.length}`, textGroups);
  }

  getTranslationByNode(textNode: Node, hashId = this.getSettingsHashIdParams()): string {
    if (!this.translations.has(hashId)) {
      this.translations.set(hashId, new WeakMap());
    }
    return this.translations.get(hashId).get(textNode) ?? "";
  }

  private async translateNode(textNode: Node): Promise<string> {
    const hashId = this.getSettingsHashIdParams();
    const translation = this.getTranslationByNode(textNode, hashId);
    if (translation) return translation;

    const text = textNode.textContent;
    const textHash = await sha256Hex(text);

    // TODO: make real api-call + check persistent/session cache
    const apiResponse = await Promise.resolve(textHash).then((data) => {
      const translation = this.getTranslationByNode(textNode);
      this.logger.info(textNode, { translation, textNode })
      return data;
    });

    this.translations.get(hashId).set(textNode, apiResponse);

    return apiResponse;
  }

  private detectLanguage(textNode: Node): string {
    const isDetected = this.detectedLanguages.has(textNode);
    if (!isDetected) {
      const text = textNode.textContent;
      let detectedLang = franc(text, { minLength: 2 });
      if (detectedLang === "und") {
        detectedLang = textNode.parentElement.closest(`[lang]`)?.getAttribute("lang");
      }
      this.detectedLanguages.set(textNode, detectedLang);
      return detectedLang;
    }
    return this.detectedLanguages.get(textNode);
  }

  private textNodesFilter(node: Node): boolean {
    const parentElem = node.parentElement;
    const fastSkip = !parentElem || PageTranslator.SKIP_TAGS.has(parentElem.tagName);
    if (fastSkip) {
      return false;
    }
    const text = node.nodeValue.trim();
    const empty = !text.length;
    const hasWords = PageTranslator.RX_LETTER.test(text);
    return !empty && hasWords;
  }

  private collectPageTextsNodes(rootElem = document.body): Node[] {
    const treeWalker = document.createTreeWalker(rootElem, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const accepted = this.textNodesFilter(node);
          return accepted ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      }
    );
    const nodes = [];
    while (treeWalker.nextNode()) nodes.push(treeWalker.currentNode);
    return nodes;
  }

  private watchNewDOMTextNodes(rootElem = document.body): () => void {
    const observer = new MutationObserver(mutations => {
      const newTextNodes: Node[] = [];

      mutations.forEach(({ addedNodes }) => {
        const textNodes = Array
          .from(addedNodes.values())
          .filter((node: Node) => node.nodeType === Node.TEXT_NODE);
        newTextNodes.push(...textNodes.filter(this.textNodesFilter));
      });

      if (newTextNodes.length) {
        this.processNodes(newTextNodes);
      }
    });

    observer.observe(rootElem, { subtree: true, childList: true });
    return () => observer.disconnect();
  }

  // TODO: keep translations temporary in window.sessionStorage
  private persistTranslation(provider: ProviderCodeName, params: TranslateParams) {

  }
}