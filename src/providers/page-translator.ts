import { reaction } from "mobx";
import { franc } from "franc";
import { md5 } from "js-md5";
import { autoBind, createLogger, disposer, LoggerColor } from "../utils";
import { ProviderCodeName } from "./providers";
import { settingsStore } from "../components/settings/settings.storage";
import { getTranslator } from "./translator";

export type LangSource = string;
export type LangTarget = string;
export type TranslationHashId = `${ProviderCodeName}_${LangSource}_${LangTarget}`;

export interface PageTranslatorParams {
  persistent?: boolean; // cache page translations per window tab in `sessionStorage`, default: true
}

export class PageTranslator {
  static readonly RX_LETTER = /\p{L}/u;
  static readonly SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);
  static readonly API_MAX_CHARS_LIMIT_PER_REQUEST = 5000;

  protected textNodes = new Set<Node>();
  protected translations = new WeakMap<Node, Record<TranslationHashId, string /*translation*/>>();
  protected originalText = new WeakMap<Node, string>();
  protected originalTextRaw = new WeakMap<Node, string>();
  protected detectedLanguages = new WeakMap<Node, string>();
  protected logger = createLogger({ systemPrefix: "[PAGE-TRANSLATOR]", prefixColor: LoggerColor.INFO_SYSTEM });
  protected dispose = disposer();

  constructor(private params: PageTranslatorParams = {}) {
    autoBind(this);

    const { persistent = true } = params;
    this.params = { persistent };
  }

  get settings() {
    return settingsStore.data.fullPageTranslation;
  }

  getProviderParams() {
    const { provider, langFrom, langTo } = this.settings;
    return { provider, langFrom, langTo };
  }

  getProviderHashId(params = this.getProviderParams()): TranslationHashId {
    const { provider, langFrom, langTo } = params;
    return `${provider}_${langFrom}_${langTo}`;
  }

  hasEnabledAutoTranslation(url: string): boolean {
    return this.settings.alwaysTranslatePages.includes(this.normalizeUrl(url));
  }

  normalizeUrl(url: string): string {
    return new URL(url).origin;
  }

  setAutoTranslateSettingUrl(urls: { enabled?: string[], disabled?: string[] }) {
    if (urls.enabled) {
      const uniqUrls = new Set([
        ...this.settings.alwaysTranslatePages,
        ...urls.enabled.map(this.normalizeUrl),
      ]);
      this.settings.alwaysTranslatePages = Array.from(uniqUrls);
    }
    if (urls.disabled) {
      const excludedUrls = new Set(this.settings.alwaysTranslatePages);
      const excludingUrls = new Set(urls.disabled.map(this.normalizeUrl))
      const uniqUrls = excludedUrls.difference(excludingUrls);
      this.settings.alwaysTranslatePages = Array.from(uniqUrls);
    }
  }

  startAutoTranslation() {
    const textNodes = this.collectDOMTextNodes();
    this.importNodes(textNodes);
    void this.translateNodes(textNodes);

    this.dispose.push(
      reaction(this.getProviderParams, this.refreshTranslations, { delay: 250 }),
      this.watchDOMTextNodes(),
      () => this.textNodes.clear(),
    );
  }

  stopAutoTranslation() {
    const textNodes = [...this.textNodes];
    this.restoreDOM(textNodes, { restoreOriginalText: true });
    this.dispose();
  }

  protected updateDOMResults(textNodes: Node[], providerHashId = this.getProviderHashId()) {
    const { showOriginalOnHover, showTranslationOnHover, showTranslationInDOM } = this.settings;

    window.requestAnimationFrame(() => {
      textNodes.forEach(node => {
        const translation = this.getTranslationByNode(node, providerHashId);
        const parentElem: HTMLElement = node.parentElement;
        const tooltipElem: HTMLElement = parentElem.closest(`[data-tooltip]`) ?? parentElem;

        const originalText = this.originalTextRaw.get(node);
        const prevTranslation = tooltipElem.dataset.translation ?? "";
        const prevOriginal = tooltipElem.dataset.original ?? "";

        tooltipElem.dataset.tooltip = String(!!(showOriginalOnHover || showTranslationOnHover));

        if (showTranslationInDOM) {
          const { leadingSpaces, trailingSpaces } = this.getNodeSpaces(node);
          node.nodeValue = `${leadingSpaces}${translation}${trailingSpaces}`;
        }

        if (showOriginalOnHover) {
          tooltipElem.dataset.original = `${prevOriginal} ${originalText}`;
          if (parentElem != tooltipElem) {
            parentElem.dataset.original = originalText;
          }
        }
        if (showTranslationOnHover) {
          tooltipElem.dataset.translation = `${prevTranslation} ${translation}`;
          if (parentElem != tooltipElem) {
            parentElem.dataset.translation = translation;
          }
        }
      });
    });
  }

  restoreDOM(textNodes: Node[], { restoreOriginalText = false } = {}) {
    window.requestAnimationFrame(() => {
      textNodes.forEach(node => {
        delete node.parentElement.dataset.tooltip;
        delete node.parentElement.dataset.translation;
        delete node.parentElement.dataset.original;
        if (restoreOriginalText) {
          node.nodeValue = this.originalTextRaw.get(node);
        }
      });
    });
  };

  async refreshTranslations() {
    const textNodes = [...this.textNodes];
    this.restoreDOM(textNodes);
    return this.translateNodes(textNodes);
  };

  protected importNodes(nodes: Node[]) {
    nodes.forEach(textNode => {
      const txt = this.normalizeText(textNode); // cut redundant empty spaces
      this.textNodes.add(textNode);
      this.originalText.set(textNode, txt);
      this.originalTextRaw.set(textNode, textNode.nodeValue);
      this.logger.info(`IMPORT NODE: ${txt}`, textNode);
    })
  }

  protected getNodeSpaces(node: Node) {
    const text = this.originalText.get(node);
    const textRaw = this.originalTextRaw.get(node);
    const spaces = { leadingSpaces: "", trailingSpaces: "" };

    if (text && textRaw && text !== textRaw) {
      spaces.leadingSpaces = textRaw.slice(0, textRaw.indexOf(text));
      spaces.trailingSpaces = textRaw.slice(spaces.leadingSpaces.length + text.length);
    }
    return spaces;
  }

  protected packNodes(textNodes: Node[], {
    limit = PageTranslator.API_MAX_CHARS_LIMIT_PER_REQUEST,
  } = {}): Node[][] {
    const packs: Node[][] = [];
    let currentPack: Node[] = [];
    let bufferLen = 0; // in code-points

    for (const node of textNodes) {
      const txt = this.originalText.get(node);
      const len = [...txt].length; // safe for chars like: 😊 𐍈 等

      if (bufferLen + len > limit) {
        if (currentPack.length) packs.push(currentPack);
        currentPack = [];
        bufferLen = 0;
      }
      currentPack.push(node);
      bufferLen += len;
    }

    if (currentPack.length) {
      packs.push(currentPack); // add tail (if any)
    }

    return packs;
  }

  protected async translateNodes(textNodes: Node[]): Promise<string[]> {
    const providerParams = this.getProviderParams();
    const providerHashId = this.getProviderHashId(providerParams);
    try {
      const freshNodes = textNodes.filter(node => !this.getTranslationByNode(node, providerHashId));
      const packedNodes = this.packNodes(freshNodes);
      this.logger.info(`PROCESSING NODE GROUPS: ${packedNodes.length}`, packedNodes);

      const translations = (
        await Promise.all(
          packedNodes.map(async nodes => {
            const translationTexts = await this.translateApiRequest(nodes);
            if (this.params.persistent) this.saveStorageCache(nodes, translationTexts, providerHashId);
            return translationTexts;
          })
        )
      ).flat();

      this.updateDOMResults(textNodes, providerHashId);
      this.logger.info(`TRANSLATED`, translations);
      return translations;
    } catch (err) {
      this.logger.error(`TRANSLATION FAILED`, err, providerParams);
      throw err;
    }
  }

  getTranslationByNode(textNode: Node, hashId = this.getProviderHashId()): string {
    if (!this.translations.has(textNode)) {
      this.translations.set(textNode, {});
    }
    let translation = this.translations.get(textNode)[hashId];
    if (!translation && this.params.persistent) {
      const storageCache = this.getStorageCache(textNode, hashId);
      if (storageCache) {
        translation = storageCache; // restore to memory-cache from storage (sync)
        this.translations.get(textNode)[hashId] = storageCache;
      }
    }
    return translation ?? "";
  }

  async translateApiRequest(textNodes: Node[], params = this.getProviderParams()): Promise<string[]> {
    const hashId = this.getProviderHashId(params);
    const texts = textNodes.map(node => this.originalText.get(node));
    const translator = getTranslator(params.provider);

    this.logger.info(`TRANSLATE API REQUEST for ${texts.length} items`, { ...params, texts });

    const translations = await translator.translateMany({
      langFrom: params.langFrom,
      langTo: params.langTo,
      texts,
    });

    // save to memory cache
    translations.forEach((translation, index) => {
      const text = texts[index];
      const node = textNodes[index];

      if (!this.translations.has(node)) this.translations.set(node, {});
      this.translations.get(node)[hashId] = translation;

      this.logger.info(`TRANSLATION LOADED: ${text}`, {
        ...params,
        originalText: text,
        translationCache: translation,
      })
    });

    return translations;
  }

  normalizeText(node: Node): string {
    return node.nodeValue.trim();
  }

  acceptTextNodeFilter(node: Node): boolean {
    if (node.nodeType !== Node.TEXT_NODE) return false;

    const parentElem = node.parentElement;
    const skippedByParentTag = !parentElem || PageTranslator.SKIP_TAGS.has(parentElem.tagName);
    if (skippedByParentTag) return false;

    const text = this.normalizeText(node);
    const empty = !text.length;
    const hasWords = PageTranslator.RX_LETTER.test(text);
    return !empty && hasWords;
  }

  collectDOMTextNodes(rootElem = document.body): Node[] {
    const treeWalker = document.createTreeWalker(rootElem, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const accepted = this.acceptTextNodeFilter(node);
          return accepted ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      }
    );
    const nodes = [];
    while (treeWalker.nextNode()) nodes.push(treeWalker.currentNode);
    return nodes;
  }

  watchDOMTextNodes(rootElem = document.body): () => void {
    const observer = new MutationObserver(mutations => {
      let newTextNodes: Node[] = [];

      mutations.forEach(({ addedNodes }) => {
        const textNodes = Array.from(addedNodes.values()).filter(this.acceptTextNodeFilter);
        newTextNodes.push(...textNodes);
      });

      if (newTextNodes.length) {
        this.logger.info('DOM-WATCH NEW NODES', newTextNodes);
        this.importNodes(newTextNodes);
        void this.translateNodes(newTextNodes);
      }
    });

    observer.observe(rootElem, { subtree: true, childList: true });
    return () => observer.disconnect();
  }

  detectLanguage(textNode: Node): string {
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

  protected getStorageHashId(text: string, providerHashId = this.getProviderHashId()) {
    return `${providerHashId}--${md5(text)}`;
  }

  protected saveStorageCache(textNodes: Node[], translations: string[], providerHashId = this.getProviderHashId()): void {
    queueMicrotask(() => {
      textNodes.forEach((textNode, index) => {
        const originalText = this.originalText.get(textNode);
        if (originalText) {
          const translationCacheId = this.getStorageHashId(originalText, providerHashId);
          sessionStorage.setItem(translationCacheId, translations[index]);
        }
      })
    });
  }

  protected getStorageCache(textNode: Node, providerHashId = this.getProviderHashId()): string | undefined {
    const text = this.originalText.get(textNode);
    if (text) {
      const storageCacheId = this.getStorageHashId(text, providerHashId);
      return sessionStorage.getItem(storageCacheId);
    }
  }
}