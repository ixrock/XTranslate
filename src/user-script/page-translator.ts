import { comparer, observable, reaction } from "mobx";
import { md5 } from "js-md5";
import debounce from "lodash/debounce";
import { autoBind, createLogger, disposer, LoggerColor, strLengthCodePoints } from "../utils";
import { settingsStore } from "../components/settings/settings.storage";
import { getTranslator, ProviderCodeName } from "../providers";

export type LangSource = string;
export type LangTarget = string;
export type TranslationHashId = `${ProviderCodeName}_${LangSource}_${LangTarget}`;

export interface PageTranslatorParams {
  sessionCache?: boolean; // cache page translations per tab in `window.sessionStorage` Ø(default: true)
  autoTranslateDelayMs?: number; /* default: 500ms */
}

interface TranslationUnit {
  node: Node;
  text: string;
  partIndex: number;
  partCount: number;
}

export class PageTranslator {
  static readonly RX_LETTER = /\p{L}/u;
  static readonly SKIP_TAGS = ["SCRIPT", "STYLE", "NOSCRIPT", "CODE"];

  static readonly DEFAULT_API_LIMIT_CHARS_PER_REQUEST = 5000;
  static readonly FULL_PAGE_API_LIMIT_CHARS_PER_REQUEST: Partial<Record<ProviderCodeName, number>> = {
    [ProviderCodeName.GOOGLE]: 5000,
    [ProviderCodeName.BING]: 5000,
    [ProviderCodeName.XTRANSLATE_PRO]: 30000,
  };

  protected logger = createLogger({ systemPrefix: "[PAGE-TRANSLATOR]", prefixColor: LoggerColor.INFO_SYSTEM });
  protected dispose = disposer();

  protected nodesAll = observable.set<Node>();
  protected nodesFromViewport = observable.set<Node>();
  protected translations = new WeakMap<Node, Record<TranslationHashId, string>>();
  protected originalText = new WeakMap<Node, string>();
  protected originalTextRaw = new WeakMap<Node, string>();
  protected tooltipNodes = new WeakMap<HTMLElement, Set<Text>>();

  constructor(private params: PageTranslatorParams = {}) {
    autoBind(this);
    const {
      sessionCache = true,
      autoTranslateDelayMs = 500,
    } = params;
    this.params = { sessionCache, autoTranslateDelayMs };
  }

  get nodes(): Node[] {
    const nodeList = this.settings.trafficSaveMode ? this.nodesFromViewport : this.nodesAll;
    return Array.from(nodeList);
  }

  get settings() {
    return settingsStore.data.fullPageTranslation;
  }

  get isEnabled() {
    return this.isAlwaysTranslate(document.URL);
  }

  private getNodeText = (node: Text) => node.textContent; // N.B. select>option>#Text.nodeValue always empty`
  private getNodeImageText = (node: HTMLImageElement | HTMLAreaElement) => node.alt;
  private getNodeSelectLabel = (node: HTMLOptGroupElement | HTMLOptionElement) => node.label;
  private getNodeInputPlaceholder = (node: HTMLInputElement | HTMLTextAreaElement) => node.placeholder;
  private getNodeInputButtonValue = (node: HTMLInputElement) => {
    if (["submit", "reset", "button"].includes(node.type)) {
      return node.value;
    }
  }

  getTranslation(node: Node, providerId = this.getProviderHashId()): string {
    if (!this.translations.has(node)) {
      this.translations.set(node, {});
    }

    const translations = this.translations.get(node);
    let translation = translations[providerId];
    if (translation) return translation;

    if (this.params.sessionCache) {
      const cachedTranslation = this.getStorageCache(node, providerId);
      if (cachedTranslation) {
        translations[providerId] = cachedTranslation;
        return cachedTranslation;
      }
    }

    return "";
  }

  getProviderHashId(): TranslationHashId {
    const { provider, langFrom, langTo } = this.settings;
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
    const nodes = this.collectNodes();
    this.processNodes(nodes);

    this.dispose.push(
      this.bindDOMNodesAutoTranslation(),
      this.bindTranslationOnSettingsChange(),
      this.watchDOMNodeUpdates(),
      () => this.clearCollectedNodes(),
    );
  }

  stopAutoTranslation() {
    this.restoreDOM();
    this.dispose();
  }

  protected bindTranslationOnSettingsChange = () => {
    return reaction(() => {
        const { showMore, alwaysTranslatePages, ...settings } = this.settings;
        return settings;
      },
      this.refreshTranslations
    );
  }

  protected bindDOMNodesAutoTranslation = () => {
    return reaction(() => this.nodes,
      this.refreshTranslations,
      {
        fireImmediately: true,
        delay: this.params.autoTranslateDelayMs,
        equals: comparer.structural,
      }
    );
  }

  protected clearCollectedNodes() {
    this.nodesAll.clear();
    this.nodesFromViewport.clear();
  }

  protected updateDOMNode(node: Node, text: string) {
    if (node instanceof Text) {
      this.updateTextNode(node, text);
    }
    if (node instanceof HTMLImageElement || node instanceof HTMLAreaElement) {
      node.alt = text;
    }
    if (node instanceof HTMLOptGroupElement || node instanceof HTMLOptionElement) {
      node.label = text;
    }
    if (node instanceof HTMLInputElement) {
      if (this.getNodeInputButtonValue(node)) node.value = text;
      if (this.getNodeInputPlaceholder(node)) node.placeholder = text;
    }
    if (node instanceof HTMLTextAreaElement) {
      node.placeholder = text;
    }
  }

  protected updateDOM() {
    this.logger.info("UPDATE DOM");
    this.nodes.forEach(node => {
      const translation = this.getTranslation(node);
      if (translation) this.updateDOMNode(node, translation);
    });
  }

  restoreDOM() {
    this.logger.info("RESTORE DOM");
    this.nodes.forEach(node => {
      const originalText = this.originalTextRaw.get(node);
      this.updateDOMNode(node, originalText);
    });
  };

  protected updateTextNode(node: Text, text: string) {
    const { showTranslationInDOM, showOriginalOnHover, showTranslationOnHover } = this.settings;
    const showTooltip = showOriginalOnHover || showTranslationOnHover;
    const isReset = text === this.originalTextRaw.get(node);

    if (showTranslationInDOM) {
      if (isReset) {
        node.nodeValue = text;
      } else {
        const { leadingSpaces, trailingSpaces } = this.getSpaces(node);
        node.nodeValue = `${leadingSpaces}${text}${trailingSpaces}`;
      }
    }
    if (showTooltip) {
      this.setTooltip(node, isReset);
    }
  }

  protected setTooltip(node: Text, isReset: boolean) {
    const tooltipElem = node.parentElement as HTMLElement;
    const textNodes = Array.from(this.tooltipNodes.get(tooltipElem) ?? []);
    if (!textNodes.length) return;

    if (isReset) {
      const parentElem = node.parentElement as HTMLElement;
      delete parentElem?.dataset.xtranslateTooltip; // [data-xtranslate-tooltip]
      delete parentElem?.dataset.xtranslateOriginal; // [data-xtranslate-original]
      delete parentElem?.dataset.xtranslateTranslation; // [data-xtranslate-translation]
    } else {
      tooltipElem.dataset.xtranslateTooltip = "";

      if (this.settings.showOriginalOnHover) {
        tooltipElem.dataset.xtranslateOriginal = textNodes
          .map((node: Text) => this.originalText.get(node))
          .join(" ")
      }

      if (this.settings.showTranslationOnHover) {
        tooltipElem.dataset.xtranslateTranslation = textNodes
          .map((node: Text) => this.getTranslation(node))
          .join(" ")
      }
    }
  }

  protected refreshTranslations = debounce(async () => {
    this.logger.info("REFRESH TRANSLATIONS");

    await this.translateNodes();

    queueMicrotask(() => {
      this.restoreDOM()
      this.updateDOM();
    });
  });

  protected importNode(node: Node) {
    if (this.nodesAll.has(node)) return;

    this.nodesAll.add(node);

    let text = "";

    if (node instanceof Text) {
      text = this.getNodeText(node);

      const parentElem = node.parentElement;
      if (parentElem) {
        const childrenTexts = this.tooltipNodes.get(parentElem) ?? new Set<Text>();
        childrenTexts.add(node);
        this.tooltipNodes.set(parentElem, childrenTexts);
      }
    }
    if (node instanceof HTMLImageElement || node instanceof HTMLAreaElement) {
      text = this.getNodeImageText(node);
    }
    if (node instanceof HTMLOptGroupElement || node instanceof HTMLOptionElement) {
      text = this.getNodeSelectLabel(node);
    }
    if (node instanceof HTMLInputElement) {
      const placeholder = this.getNodeInputPlaceholder(node);
      const buttonValue = this.getNodeInputButtonValue(node);
      if (placeholder) text = placeholder;
      else if (buttonValue) text = buttonValue;
    }
    if (node instanceof HTMLTextAreaElement) {
      text = this.getNodeInputPlaceholder(node);
    }

    if (text) {
      this.originalText.set(node, text.trim());
      this.originalTextRaw.set(node, text);
    }
  }

  protected processNodes(nodes: Node[]) {
    nodes.forEach(node => this.importNode(node));

    if (this.settings.trafficSaveMode) {
      this.dispose.push(this.enableTrafficSaveMode(nodes));
    }
  }

  protected getSpaces(node: Node) {
    const text = this.originalText.get(node);
    const textRaw = this.originalTextRaw.get(node);
    const spaces = { leadingSpaces: "", trailingSpaces: "" };

    if (text && textRaw && text !== textRaw) {
      spaces.leadingSpaces = textRaw.slice(0, textRaw.indexOf(text));
      spaces.trailingSpaces = textRaw.slice(spaces.leadingSpaces.length + text.length);
    }
    return spaces;
  }

  protected getApiLimitCharsPerRequest(provider = this.settings.provider): number {
    return (
      PageTranslator.FULL_PAGE_API_LIMIT_CHARS_PER_REQUEST[provider]
      ?? PageTranslator.DEFAULT_API_LIMIT_CHARS_PER_REQUEST
    );
  }

  protected splitByCodePoints(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const chars = Array.from(text);

    for (let i = 0; i < chars.length; i += chunkSize) {
      chunks.push(chars.slice(i, i + chunkSize).join(""));
    }

    return chunks;
  }

  protected splitTextForApi(text: string): string[] {
    const limit = this.getApiLimitCharsPerRequest();
    const textLen = strLengthCodePoints(text);
    if (textLen <= limit) return [text];

    const locale = this.settings.langFrom !== "auto" ? this.settings.langFrom : undefined;
    const segmenter = new Intl.Segmenter(locale, { granularity: "sentence" });
    const segments = Array.from(segmenter.segment(text), ({ segment }) => segment).filter(Boolean);

    if (!segments.length) {
      return this.splitByCodePoints(text, limit);
    }

    const chunks: string[] = [];
    let buffer = "";
    let bufferLen = 0;

    const pushBuffer = () => {
      if (buffer) {
        chunks.push(buffer);
        buffer = "";
        bufferLen = 0;
      }
    };

    for (const segment of segments) {
      const len = strLengthCodePoints(segment); // safe for chars like: 😊 𐍈 等

      if (len > limit) {
        pushBuffer();
        chunks.push(...this.splitByCodePoints(segment, limit));
        continue;
      }
      if (bufferLen + len > limit) {
        pushBuffer();
      }

      buffer += segment;
      bufferLen += len;
    }

    pushBuffer();
    return chunks.length ? chunks : this.splitByCodePoints(text, limit);
  }

  protected createTranslationUnits(nodes: Node[]): TranslationUnit[] {
    const units: TranslationUnit[] = [];

    for (const node of nodes) {
      const originalText = this.originalText.get(node);
      if (!originalText) continue;

      const textChunks = this.splitTextForApi(originalText);
      textChunks.forEach((text, partIndex) => {
        units.push({
          node,
          text,
          partIndex,
          partCount: textChunks.length,
        });
      });
    }

    return units;
  }

  protected packTranslationUnits<T extends { text: string }>(units: T[]): T[][] {
    const limit = this.getApiLimitCharsPerRequest();
    const packs: T[][] = [];
    let currentPack: T[] = [];
    let bufferLen = 0;

    for (const unit of units) {
      const len = strLengthCodePoints(unit.text);

      if (bufferLen + len > limit) {
        if (currentPack.length) packs.push(currentPack);
        currentPack = [];
        bufferLen = 0;
      }

      currentPack.push(unit);
      bufferLen += len;
    }

    if (currentPack.length) packs.push(currentPack);
    return packs;
  }

  protected async translateNodes(nodes = this.nodes): Promise<string[]> {
    const providerId = this.getProviderHashId();
    const freshNodes = nodes.filter(node => !this.getTranslation(node));
    freshNodes.forEach(node => this.importNode(node));

    this.logger.info("TRANSLATING NODES", { nodes: freshNodes });

    const units = this.createTranslationUnits(freshNodes);
    const unitTranslations: (string | undefined)[] = new Array(units.length);
    const unitsToTranslate: (TranslationUnit & { unitIndex: number })[] = [];

    units.forEach((unit, unitIndex) => {
      const cachedTranslation = this.params.sessionCache ? this.getStorageCacheByText(unit.text, providerId) : undefined;
      if (cachedTranslation !== undefined && cachedTranslation !== null) {
        unitTranslations[unitIndex] = cachedTranslation;
      } else {
        unitsToTranslate.push({ ...unit, unitIndex });
      }
    });

    const packedUnits = this.packTranslationUnits(unitsToTranslate);

    for (const pack of packedUnits) {
      const texts = pack.map(unit => unit.text);
      const translations = await this.translateApiRequest(texts);
      if (this.params.sessionCache) this.saveStorageCacheByText(texts, translations, providerId);

      pack.forEach((unit, translationIndex) => {
        const translation = translations[translationIndex];
        if (translation !== undefined) {
          unitTranslations[unit.unitIndex] = translation;
        }
      });
    }

    const partsByNode = new Map<Node, (string | undefined)[]>();
    units.forEach((unit, unitIndex) => {
      const nodeParts = partsByNode.get(unit.node) ?? Array<string | undefined>(unit.partCount).fill(undefined);
      nodeParts[unit.partIndex] = unitTranslations[unitIndex];
      partsByNode.set(unit.node, nodeParts);
    });

    const resolvedTranslations: string[] = [];
    const cacheTexts: string[] = [];
    const cacheTranslations: string[] = [];
    freshNodes.forEach(node => {
      const parts = partsByNode.get(node);
      if (!parts || parts.some(part => part === undefined)) return;

      const translation = parts.join("");
      const savedTranslations = this.translations.get(node) ?? {} as Record<TranslationHashId, string>;
      savedTranslations[providerId] = translation;
      this.translations.set(node, savedTranslations);
      resolvedTranslations.push(translation);

      if (this.params.sessionCache) {
        const originalText = this.originalText.get(node);
        if (originalText) {
          cacheTexts.push(originalText);
          cacheTranslations.push(translation);
        }
      }
    });

    if (this.params.sessionCache && cacheTexts.length) {
      this.saveStorageCacheByText(cacheTexts, cacheTranslations, providerId);
    }

    return resolvedTranslations;
  }

  async translateApiRequest(texts: string[]): Promise<string[]> {
    const { provider, langFrom, langTo } = this.settings;
    const translator = getTranslator(provider);

    try {
      const translations = await translator.translateMany({
        from: langFrom,
        to: langTo,
        texts,
      });

      const result = texts.map((originalText, i) => [originalText, translations[i]]);
      this.logger.info(`TRANSLATED TEXTS: ${texts.length}`, { result });

      return translations;
    } catch (err) {
      this.logger.error(`TRANSLATION FAILED: ${err?.message}`);
    }

    return [];
  }

  isTranslatableNode(node: Node): boolean {
    const elem = node instanceof Text ? node.parentElement : node as HTMLElement;
    const skipByTag = !elem || PageTranslator.SKIP_TAGS.includes(elem.tagName);
    if (skipByTag) return false;

    if (node instanceof Text) {
      const text = this.getNodeText(node);
      const empty = !text.length;
      const hasWords = PageTranslator.RX_LETTER.test(text);
      return !empty && hasWords;
    }
    if (node instanceof HTMLImageElement || node instanceof HTMLAreaElement) {
      return Boolean(this.getNodeImageText(node));
    }
    if (node instanceof HTMLOptGroupElement || node instanceof HTMLOptionElement) {
      return Boolean(this.getNodeSelectLabel(node));
    }
    if (node instanceof HTMLInputElement) {
      return Boolean(this.getNodeInputPlaceholder(node) || this.getNodeInputButtonValue(node));
    }
    if (node instanceof HTMLTextAreaElement) {
      return Boolean(this.getNodeInputPlaceholder(node));
    }
  }

  protected collectNodes(rootElem: HTMLElement | ShadowRoot = document.body): Node[] {
    const nodes = new Set<Node>();

    const treeWalker = document.createTreeWalker(
      rootElem,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Node) => {
          // collect shadow-dom text inner contents first
          if (node instanceof HTMLElement) {
            const shadowElem = node.shadowRoot;
            if (shadowElem) {
              this.collectNodes(shadowElem).forEach(node => nodes.add(node));
            }
          }

          // handle <select> inner text content manually since `IntersectionObserver` can't track them (settings.trafficSaveMode==true)
          if (this.settings.trafficSaveMode) {
            if (node instanceof HTMLOptionElement || node instanceof HTMLOptGroupElement) {
              if (this.getNodeSelectLabel(node)) {
                this.nodesFromViewport.add(node);
              }
            }
          }

          const isTranslatable = this.isTranslatableNode(node);
          if (isTranslatable === undefined) {
            return NodeFilter.FILTER_SKIP; // traverse child nodes
          }

          return isTranslatable ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      }
    );

    while (treeWalker.nextNode()) {
      nodes.add(treeWalker.currentNode);
    }

    return Array.from(nodes);
  }

  protected watchDOMNodeUpdates(rootElem = document.body) {
    const observer = new MutationObserver(mutations => {
      const freshNodes: Node[] = [];

      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (this.isTranslatableNode(node)) {
            freshNodes.push(node);
          }

          if (node.nodeType === Node.ELEMENT_NODE) {
            const innerNodes = this.collectNodes(node as HTMLElement);
            freshNodes.push(...innerNodes);
          }
        });
      }

      if (freshNodes.length) {
        this.logger.info("NEW TEXT NODES", freshNodes);
        this.processNodes(freshNodes);
      }
    });

    observer.observe(rootElem, { subtree: true, childList: true, characterData: false });
    return () => observer.disconnect();
  }

  protected enableTrafficSaveMode(nodes: Node[]) {
    const intersectionObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;

            if (this.isTranslatableNode(target)) {
              this.nodesFromViewport.add(target); // handle <img alt>, <input placeholder>, etc.
              intersectionObserver.unobserve(target);
            } else {
              const texts = this.tooltipNodes.get(target);
              if (texts) {
                texts.forEach((text) => this.nodesFromViewport.add(text));
                intersectionObserver.unobserve(target); // children texts processed, stop watching
              }
            }
          }
        }

        // handle native <select> contents since they might NOT be caught within `IntersectionObserver.entries`
        // e.g. example with async preloaded data for <select> https://oma.kela.fi/paatokset-ja-muut-asiakirjasi/kelan-lahettamat
        Array.from(document.querySelectorAll("option, optgroup"))
          .filter(this.isTranslatableNode)
          .forEach(node => this.nodesFromViewport.add(node));
      }, {
        rootMargin: "0px 0px 50% 0px",
        threshold: 0,
      }
    );

    nodes
      .map(node => node instanceof Text ? node.parentElement : node as HTMLElement)
      .filter(Boolean)
      .forEach(elem => intersectionObserver.observe(elem)); // subscribe

    return () => intersectionObserver.disconnect(); // unsubscribe
  }

  protected getStorageHashId(text: string, providerId = this.getProviderHashId()) {
    return `${providerId}--${md5(text)}`;
  }

  protected saveStorageCacheByText(texts: string[], translations: string[], providerId = this.getProviderHashId()): void {
    queueMicrotask(() => {
      texts.forEach((text, index) => {
        const translation = translations[index];
        if (text && translation) {
          const translationCacheId = this.getStorageHashId(text, providerId);
          sessionStorage.setItem(translationCacheId, translation);
        }
      });
    });
  }

  protected getStorageCache(node: Node, providerId = this.getProviderHashId()): string | undefined {
    const text = this.originalText.get(node);
    if (text) {
      return this.getStorageCacheByText(text, providerId);
    }
  }

  protected getStorageCacheByText(text: string, providerId = this.getProviderHashId()): string | undefined {
    const storageCacheId = this.getStorageHashId(text, providerId);
    return sessionStorage.getItem(storageCacheId);
  }
}
