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
  autoTranslateDelayMs?: number; /* default: 500 */
}

export class PageTranslator {
  static readonly RX_LETTER = /\p{L}/u;
  static readonly SKIP_TAGS = ["SCRIPT", "STYLE", "NOSCRIPT", "CODE"];
  static readonly MAX_API_LIMIT_CHARS_PER_REQUEST = 5000;

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
      this.bindTextsAutoTranslation(),
      this.bindRefreshTranslationsOnParamsChange(),
      this.watchDOMNodeUpdates(),
      () => this.clearCollectedNodes(),
    );
  }

  stopAutoTranslation() {
    this.restoreDOM();
    this.dispose();
  }

  protected bindRefreshTranslationsOnParamsChange = () => {
    return reaction(() => {
        const { showMore, alwaysTranslatePages, ...settings } = this.settings;
        return settings;
      },
      this.refreshTranslations,
      {
        delay: this.params.autoTranslateDelayMs,
        equals: comparer.shallow,
      }
    );
  }

  protected bindTextsAutoTranslation = () => {
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

  protected importNode(node: Node, nodes: Node[]) {
    if (this.nodesAll.has(node)) return;

    this.nodesAll.add(node);

    let text = "";

    if (node instanceof Text) {
      text = this.getNodeText(node);

      const parentElem = node.parentElement;
      if (parentElem) {
        if (!this.tooltipNodes.get(parentElem)) {
          const childrenTexts = nodes.filter(textNode => parentElem.contains(textNode)) as Text[]; // TODO: optimize?
          this.tooltipNodes.set(parentElem, new Set(childrenTexts));
        }
        this.tooltipNodes.get(parentElem).add(node);
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
    nodes.forEach(node => this.importNode(node, nodes));

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

  // TODO: split big sentences with `Intl.Segmenter` for better API-caching
  protected packNodes(nodes: Node[]): Node[][] {
    const limit = PageTranslator.MAX_API_LIMIT_CHARS_PER_REQUEST;
    const packs: Node[][] = [];
    let currentPack: Node[] = [];
    let bufferLen = 0; // in code-points

    for (const node of nodes) {
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

  protected async translateNodes(nodes = this.nodes): Promise<string[]> {
    const freshNodes = nodes.filter(node => !this.getTranslation(node));
    freshNodes.forEach(node => this.importNode(node, nodes));

    this.logger.info("TRANSLATING NODES", { nodes: freshNodes })

    const packedNodes = this.packNodes(freshNodes);
    return (
      await Promise.all(
        packedNodes.map(async nodes => {
          const translations = await this.translateApiRequest(nodes);
          if (this.params.sessionCache) this.saveStorageCache(nodes, translations);
          return translations;
        })
      )
    ).flat();
  }

  async translateApiRequest(nodes: Node[]): Promise<string[]> {
    const { provider, langFrom, langTo } = this.settings;
    const providerId = this.getProviderHashId();
    const texts = nodes.map(node => this.originalText.get(node));
    const translator = getTranslator(provider);

    try {
      const translations = await translator.translateMany({
        from: langFrom,
        to: langTo,
        texts,
      });

      const result = texts.map((originalText, i) => [originalText, translations[i]]);
      this.logger.info(`TRANSLATED TEXTS: ${nodes.length}`, { result });

      translations.forEach((translation, index) => {
        const node = nodes[index];
        const savedTranslations = this.translations.get(node);
        savedTranslations[providerId] = translation;
      });

      return translations;
    } catch (err) {
      this.logger.error(`TRANSLATION FAILED: ${err}`, { texts });
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
        // @ts-ignore https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver#delay
        delay: this.params.autoTranslateDelayMs,
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

  protected saveStorageCache(nodes: Node[], translations: string[]): void {
    queueMicrotask(() => {
      nodes.forEach((node, index) => {
        const originalText = this.originalText.get(node);
        if (originalText) {
          const translation = translations[index];
          if (translation) {
            const translationCacheId = this.getStorageHashId(originalText);
            sessionStorage.setItem(translationCacheId, translation);
          }
        }
      })
    });
  }

  protected getStorageCache(node: Node, providerId = this.getProviderHashId()): string | undefined {
    const text = this.originalText.get(node);
    if (text) {
      const storageCacheId = this.getStorageHashId(text, providerId);
      return sessionStorage.getItem(storageCacheId);
    }
  }
}