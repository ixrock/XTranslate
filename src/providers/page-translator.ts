import { reaction } from "mobx";
import { franc } from "franc";
import { autoBind, disposer } from "../utils";
import { ProviderCodeName } from "./providers";
import type { TranslateParams } from "./translator";
import { settingsStore } from "../components/settings/settings.storage";

export type LangSource = string;
export type LangTarget = string;
export type TranslatorParamsHashId = `${ProviderCodeName}_${LangSource}_${LangTarget}`;

export interface PageTranslatorParams {
}

export class PageTranslator {
  private textNodes = new Set<Node>();
  private translations: Map<TranslatorParamsHashId, WeakMap<Node, string/*translation*/>> = new Map();
  private detectedLanguages = new WeakMap<Node, string>();
  private dispose = disposer();

  constructor(private params: PageTranslatorParams = {}) {
    autoBind(this);
  }

  getParams() {
    const { provider, langFrom, langTo } = settingsStore.data.fullPageTranslation;
    return { provider, langFrom, langTo };
  }

  getTranslationSettingsHashId(params = this.getParams()): TranslatorParamsHashId {
    const { provider, langFrom, langTo } = params;
    return `${provider}_${langFrom}_${langTo}`;
  }

  startAutoTranslation() {
    const textNodes = this.collectPageTextsNodes();
    this.processNodes(textNodes);

    this.dispose.push(
      reaction(this.getParams, this.refreshTranslations, { delay: 250 }),
      this.watchNewDOMTextNodes(),
    );
  }

  stopAutoTranslation() {
    this.textNodes.clear();
    this.dispose();
  }

  private async refreshTranslations() {
    return Promise.allSettled(
      Array.from(this.textNodes).map(this.translateNode)
    );
  };

  private processNodes(textNodes: Node[]) {
    queueMicrotask(() => {
      const freshNodes = textNodes.filter(node => !this.textNodes.has(node));
      freshNodes.forEach(node => {
        console.log('[PROCESS-TEXT-NODE]', node);
        this.textNodes.add(node);
        // this.detectLanguage(node);
        // void this.translateNode(node);
      });
    })
  };

  private async translateNode(textNode: Node) {
    const key = this.getTranslationSettingsHashId(this.getParams());

    if (!this.translations.has(key)) {
      this.translations.set(key, new WeakMap());
    }

    const translation = this.translations.get(key).get(textNode);
    if (!translation) {
      const apiResponse = await Promise.resolve(textNode.textContent); // TODO: make real api-call + check persistent/session cache
      this.translations.get(key).set(textNode, apiResponse);
    }
  }

  hasDetectedLanguage(textNode: Node): boolean {
    return this.detectedLanguages.has(textNode);
  }

  detectLanguage(textNode: Node): string {
    if (!this.hasDetectedLanguage(textNode)) {
      const detectedLang = textNode.parentElement.closest(`[lang]`)?.getAttribute("lang") || franc(textNode.textContent);
      this.detectedLanguages.set(textNode, detectedLang);
      return detectedLang;
    }
    return this.detectedLanguages.get(textNode);
  }

  private collectPageTextsNodes(rootElem = document.body): Node[] {
    const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);

    const treeWalker = document.createTreeWalker(rootElem, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const elem = node.parentElement;
          if (!elem || skipTags.has(elem.tagName)) return NodeFilter.FILTER_REJECT;
          if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
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
        newTextNodes.push(...textNodes);
      });

      this.processNodes(newTextNodes);
    });

    observer.observe(rootElem, { subtree: true, childList: true });
    return () => observer.disconnect();
  }

  private persistTranslation(provider: ProviderCodeName, params: TranslateParams) {

  }
}