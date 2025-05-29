import { reaction, observable } from "mobx";
import { franc } from "franc";
import { md5 } from "js-md5";
import { autoBind, createLogger, disposer, LoggerColor, strLengthCodePoints } from "../utils";
import { settingsStore } from "../components/settings/settings.storage";
import { getTranslator, ProviderCodeName } from "../providers";

export type LangSource = string;
export type LangTarget = string;
export type TranslationHashId = `${ProviderCodeName}_${LangSource}_${LangTarget}`;

export interface PageTranslatorParams {
  persistent?: boolean; // cache page translations per window tab in `sessionStorage`, default: true
  trafficSaveModeDelayMs?: number; /* default: 500 */
}

export interface WatchViewportTextNodesOpts {
  onVisible?(elem: HTMLElement): void;
}

export class PageTranslator {
  static readonly RX_LETTER = /\p{L}/u;
  static readonly SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"]);
  static readonly MAX_API_LIMIT_CHARS_PER_REQUEST = 5000;

  protected textNodes = observable.set<Text>();
  protected textNodesViewport = observable.set<Text>();
  protected parentNodes = new WeakMap<HTMLElement, Set<Text>>();
  protected translations = new WeakMap<Text, Record<TranslationHashId, string /*translation*/>>();
  protected originalText = new WeakMap<Text, string>();
  protected originalTextRaw = new WeakMap<Text, string>();
  protected detectedLanguages = new WeakMap<Text, string>();
  protected logger = createLogger({ systemPrefix: "[PAGE-TRANSLATOR]", prefixColor: LoggerColor.INFO_SYSTEM });
  protected dispose = disposer();

  constructor(private params: PageTranslatorParams = {}) {
    autoBind(this);
    const {
      persistent = true,
      trafficSaveModeDelayMs = 500,
    } = params;
    this.params = { persistent, trafficSaveModeDelayMs };
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

  isAlwaysTranslate(url: string): boolean {
    return this.settings.alwaysTranslatePages.includes(this.normalizeUrl(url));
  }

  normalizeUrl(url: string): string {
    return new URL(url).origin;
  }

  setAutoTranslatingPages(urls: { enabled?: string[], disabled?: string[] }) {
    if (urls.enabled) {
      const uniqUrls = new Set([
        ...this.settings.alwaysTranslatePages,
        ...urls.enabled.map(this.normalizeUrl),
      ]);
      this.settings.alwaysTranslatePages = [...uniqUrls];
    }
    if (urls.disabled) {
      const translatingUrls = new Set(this.settings.alwaysTranslatePages);
      const excludedUrls = new Set(urls.disabled.map(this.normalizeUrl))
      const uniqUrls = translatingUrls.difference(excludedUrls);
      this.settings.alwaysTranslatePages = [...uniqUrls];
    }
  }

  startAutoTranslation() {
    const textNodes = this.collectTextNodes();
    this.processTextNodes(textNodes);

    this.dispose.push(
      this.bindAutoTranslationOfCollectedTexts(),
      this.bindAutoRefreshTranslationsOnParamsChange(),
      this.watchDOMTextNodes(),
      () => this.clearAllCollectedNodes(),
    );
  }

  stopAutoTranslation() {
    const textNodes = [...this.textNodes];
    this.restoreDOM(textNodes, { restoreOriginalText: true });
    this.dispose();
  }

  protected bindAutoRefreshTranslationsOnParamsChange = () => {
    return reaction(this.getProviderParams, this.refreshTranslations);
  }

  protected bindAutoTranslationOfCollectedTexts = () => {
    const getTexts = (): Text[] => {
      if (this.settings.trafficSaveMode) return [...this.textNodesViewport];
      return [...this.textNodes];
    };
    return reaction(getTexts, this.translateNodes, {
      fireImmediately: true,
      delay: this.params.trafficSaveModeDelayMs,
    });
  }

  protected clearAllCollectedNodes() {
    this.textNodes.clear();
    this.textNodesViewport.clear();
  }

  protected updateDOMResults(textNodes: Text[], providerHashId = this.getProviderHashId()) {
    const { showTranslationInDOM, showOriginalOnHover, showTranslationOnHover } = this.settings;
    const showTooltip = Boolean(showOriginalOnHover || showTranslationOnHover);

    this.restoreDOM(textNodes, {
      restoreOriginalText: !showTranslationInDOM,
    });

    textNodes.forEach(node => {
      if (showTranslationInDOM) {
        const translation = this.getTranslationByNode(node, providerHashId);
        const { leadingSpaces, trailingSpaces } = this.getNodeSpaces(node);
        node.nodeValue = `${leadingSpaces}${translation}${trailingSpaces}`;
      }
      if (showTooltip) {
        const tooltipElem = node.parentElement as HTMLElement;
        const tooltipNodes = this.parentNodes.get(tooltipElem);
        if (tooltipNodes) {
          this.setTooltip(tooltipElem, [...tooltipNodes], providerHashId);
        }
      }
    })
  }

  protected setTooltip(elem: HTMLElement, textNodes: Text[], providerHashId = this.getProviderHashId()) {
    elem.dataset.tooltip = "";

    if (this.settings.showOriginalOnHover) {
      elem.dataset.original = textNodes
        .map((node: Text) => this.originalText.get(node) || node.nodeValue)
        .join(" ")
    }

    if (this.settings.showTranslationOnHover) {
      elem.dataset.translation = textNodes
        .map((node: Text) => this.getTranslationByNode(node, providerHashId) || node.nodeValue)
        .join(" ")
    }
  }

  restoreDOM(textNodes: Text[], { restoreOriginalText = false } = {}) {
    textNodes.forEach(node => {
      const parentElem = node.parentElement as HTMLElement | null;
      delete parentElem?.dataset.tooltip;
      delete parentElem?.dataset.translation;
      delete parentElem?.dataset.original;
      if (restoreOriginalText) {
        node.nodeValue = this.originalTextRaw.get(node);
      }
    });
  };

  async refreshTranslations() {
    const textNodesAll = [...this.textNodes];
    const nodes = this.settings.trafficSaveMode ? textNodesAll : [...this.textNodesViewport];
    this.restoreDOM(textNodesAll);
    return this.translateNodes(nodes);
  };

  protected processTextNodes(nodes: Text[]) {
    nodes.forEach(node => {
      const parentElem = node.parentElement;
      if (parentElem) {
        if (!this.parentNodes.get(parentElem)) {
          const childrenTexts = nodes.filter(text => parentElem.contains(text));
          this.parentNodes.set(parentElem, new Set(childrenTexts));
        }
        this.parentNodes.get(parentElem).add(node);
      }

      const txt = this.normalizeText(node); // cut redundant empty spaces
      this.textNodes.add(node);
      this.originalText.set(node, txt);
      this.originalTextRaw.set(node, node.nodeValue);

      this.logger.info(`IMPORTED NODE: ${txt}`, { textNode: node, parentElem });
    });

    if (this.settings.trafficSaveMode) {
      this.dispose.push(this.watchVisibleTextNodes(nodes));
    }
  }

  protected getNodeSpaces(node: Text) {
    const text = this.originalText.get(node);
    const textRaw = this.originalTextRaw.get(node);
    const spaces = { leadingSpaces: "", trailingSpaces: "" };

    if (text && textRaw && text !== textRaw) {
      spaces.leadingSpaces = textRaw.slice(0, textRaw.indexOf(text));
      spaces.trailingSpaces = textRaw.slice(spaces.leadingSpaces.length + text.length);
    }
    return spaces;
  }

  // TODO: split big sentences with `Intl.Segmenter` for better API-caching
  protected packNodes(textNodes: Text[], limit = PageTranslator.MAX_API_LIMIT_CHARS_PER_REQUEST): Text[][] {
    const packs: Text[][] = [];
    let currentPack: Text[] = [];
    let bufferLen = 0; // in code-points

    for (const node of textNodes) {
      const txt = this.originalText.get(node);
      const len = strLengthCodePoints(txt); // safe for chars like: 😊 𐍈 等

      if (bufferLen + len > limit) {
        if (currentPack.length) packs.push(currentPack);
        currentPack = [];
        bufferLen = 0;
      }
      currentPack.push(node);
      bufferLen += len;
    }

    if (currentPack.length) packs.push(currentPack);
    return packs;
  }

  protected async translateNodes(textNodes: Text[]): Promise<string[]> {
    const providerParams = this.getProviderParams();
    const providerHashId = this.getProviderHashId(providerParams);
    try {
      const freshNodes = textNodes.filter(node => !this.getTranslationByNode(node, providerHashId));
      const packedNodes = this.packNodes(freshNodes);
      this.logger.info(`PROCESSING NODE GROUPS: ${packedNodes.length}`, packedNodes);

      const translations = (
        await Promise.all(
          packedNodes.map(async nodes => {
            const translations = await this.translateApiRequest(nodes);
            if (this.params.persistent) this.saveStorageCache(nodes, translations, providerHashId);
            return translations;
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

  getTranslationByNode(textNode: Text, hashId = this.getProviderHashId()): string {
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

  async translateApiRequest(textNodes: Text[], params = this.getProviderParams()): Promise<string[]> {
    const hashId = this.getProviderHashId(params);
    const texts = textNodes.map(node => this.originalText.get(node));
    const translator = getTranslator(params.provider);

    this.logger.info(`TRANSLATE API REQUEST for ${texts.length} items`, { ...params, texts });

    const translations = await translator.translateMany({
      from: params.langFrom,
      to: params.langTo,
      texts,
    });

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

  normalizeText(node: Text): string {
    return node.nodeValue.trim();
  }

  acceptTextNodeFilter(node: Node): boolean {
    if (node.nodeType !== Node.TEXT_NODE) return false;

    const parentElem = node.parentElement;
    const skippedByParentTag = !parentElem || PageTranslator.SKIP_TAGS.has(parentElem.tagName);
    if (skippedByParentTag) return false;

    const text = this.normalizeText(node as Text);
    const empty = !text.length;
    const hasWords = PageTranslator.RX_LETTER.test(text);
    return !empty && hasWords;
  }

  collectTextNodes(rootElem: HTMLElement | ShadowRoot = document.body): Text[] {
    const treeWalker = document.createTreeWalker(rootElem, NodeFilter.SHOW_TEXT, {
        acceptNode: (node: Text) => {
          const accepted = this.acceptTextNodeFilter(node);
          return accepted ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      }
    );

    const nodes: Text[] = [];
    while (treeWalker.nextNode()) nodes.push(treeWalker.currentNode as Text);
    const shadowDomNodes: Text[] = this.collectTextNodesShadowDOM(rootElem);
    nodes.push(...shadowDomNodes);

    return nodes;
  }

  protected collectTextNodesShadowDOM(rootElem: HTMLElement | ShadowRoot): Text[] {
    const shadowDomElements = Array.from(rootElem.querySelectorAll("*")).filter(elem => elem.shadowRoot) as HTMLElement[];

    if (shadowDomElements.length) {
      this.logger.info("collecting texts from shadow-DOM", shadowDomElements);
      return shadowDomElements.map(elem => this.collectTextNodes(elem.shadowRoot)).flat();
    }
    return [];
  }

  watchDOMTextNodes(rootElem = document.body): () => void {
    const observer = new MutationObserver(mutations => {
      const fresh: Text[] = [];

      for (const m of mutations) {
        m.addedNodes.forEach(node => {
          if (this.acceptTextNodeFilter(node)) fresh.push(node as Text);

          if (node.nodeType === Node.ELEMENT_NODE) {
            const innerTexts = this.collectTextNodes(node as HTMLElement);
            fresh.push(...innerTexts);
          }
        });
      }

      if (fresh.length) {
        this.logger.info("NEW TEXT NODES", fresh);
        this.processTextNodes(fresh);
      }
    });

    observer.observe(rootElem, { subtree: true, childList: true, characterData: false });
    return () => observer.disconnect();
  }

  watchVisibleTextNodes(nodes: Text[], { onVisible }: WatchViewportTextNodesOpts = {}) {
    const intersectionObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const texts = this.parentNodes.get(target);
            if (texts) {
              onVisible?.(target);
              texts.forEach((text) => this.textNodesViewport.add(text));
              intersectionObserver.unobserve(target); // children texts processed, stop watching
            }
          }
        }
      }, {
        rootMargin: "0px 0px 50% 0px",
        threshold: 0,
      }
    );

    const textParents = new Set(nodes.filter(text => text.parentElement).map(text => text.parentElement));
    textParents.forEach(elem => intersectionObserver.observe(elem)); // subscribe
    return () => intersectionObserver.disconnect(); // unsubscribe
  }

  detectLanguage(textNode: Text): string {
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

  protected saveStorageCache(textNodes: Text[], translations: string[], providerHashId = this.getProviderHashId()): void {
    queueMicrotask(() => {
      textNodes.forEach((textNode, index) => {
        const originalText = this.originalText.get(textNode);
        if (originalText) {
          const translation = translations[index];
          if (translation) {
            const translationCacheId = this.getStorageHashId(originalText, providerHashId);
            sessionStorage.setItem(translationCacheId, translation);
          }
        }
      })
    });
  }

  protected getStorageCache(textNode: Text, providerHashId = this.getProviderHashId()): string | undefined {
    const text = this.originalText.get(textNode);
    if (text) {
      const storageCacheId = this.getStorageHashId(text, providerHashId);
      return sessionStorage.getItem(storageCacheId);
    }
  }
}