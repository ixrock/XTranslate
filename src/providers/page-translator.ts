import { reaction } from "mobx";
import { franc } from "franc";
import { autoBind, disposer } from "../utils";
import { ProviderCodeName } from "./providers";
import type { TranslateParams } from "./translator";
import { settingsStore } from "../components/settings/settings.storage";

export type LangFrom = string;
export type LangTo = string;
export type TranslatorParamsHashId = `${ProviderCodeName}_${LangFrom}_${LangTo}`;

export interface PageTranslatorParams {
}

export class PageTranslator {
  private textNodes = new Set<Node>();
  private translations: Map<TranslatorParamsHashId, WeakMap<Node, string/*translation*/>> = new Map();
  private nodesDetectedLang = new WeakMap<Node, string>();
  private dispose = disposer();

  constructor(protected initParams: PageTranslatorParams = {}) {
    autoBind(this);
  }

  getParams() {
    const { provider, langFrom, langTo } = settingsStore.data.fullPageTranslation;
    return { provider, langFrom, langTo };
  }

  getParamsHashId(params = this.getParams()): TranslatorParamsHashId {
    const { provider, langFrom, langTo } = params;
    return `${provider}_${langFrom}_${langTo}`;
  }

  async translatePage() {
    const textNodes = await this.collectPageTextsNodes();
    textNodes.forEach(this.handleTranslation);

    this.dispose.push(
      reaction(this.getParams, this.refreshPage, { delay: 250 }),
      this.createTextNodeWatcher(),
    );
  }

  private refreshPage = async () => {
    return Promise.all(
      Array.from(this.textNodes).map(this.handleTranslation)
    );
  };

  private handleTranslation = (textNode: Node) => {
    const id = this.getParamsHashId(this.getParams());

    if (!this.translations.has(id)) {
      this.translations.set(id, new WeakMap());
    }

    const translation = this.translations.get(id).get(textNode);
    if (!translation) {
      queueMicrotask(async () => {
        let detectedLang = this.detectLanguage(textNode);
        if (!detectedLang) {
          detectedLang = this.detectLanguage(textNode);
          this.nodesDetectedLang.set(textNode, detectedLang);
        }
        const apiResponse = await Promise.resolve(textNode.textContent); // TODO: make real api-call + check persistent/session cache
        this.translations.get(id).set(textNode, apiResponse);
      })
    }
  }

  private async collectPageTextsNodes(rootElem = document.body): Promise<Node[]> {
    const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);

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

  detectLanguage(textNode: Node): string {
    return textNode.parentElement.closest(`[lang]`)?.getAttribute("lang") || franc(textNode.textContent);
  }

  private createTextNodeWatcher(rootElem = document.body): () => void {
    const observer = new MutationObserver(mutations => {
      const newTextNodes: Node[] = [];

      mutations.forEach(({ addedNodes }) => {
        const textNodes = Array
          .from(addedNodes.values())
          .filter((node: Node) => node.nodeType === Node.TEXT_NODE);
        newTextNodes.push(...textNodes);
      });

      queueMicrotask(() => {
        newTextNodes.forEach(this.handleTranslation);
      });
    });

    observer.observe(rootElem, { subtree: true, childList: true });
    return () => observer.disconnect();
  }

  private persistTranslation(provider: ProviderCodeName, params: TranslateParams) {

  }
}