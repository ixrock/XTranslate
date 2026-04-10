import { comparer, IObservableArray, observable, reaction } from "mobx";
import { md5 } from "js-md5";
import debounce from "lodash/debounce";
import { autoBind, createLogger, disposer, LoggerColor, strLengthCodePoints } from "../utils";
import { getTranslator, getXTranslatePro, ProviderCodeName, XTranslateProTranslateStreamBatchDoneEvent } from "../providers";
import { createStorage } from "@/storage";

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
  segmentId: string;
  partIndex: number;
  partCount: number;
}

interface PageTranslationSegment {
  node: Node;
  text: string;
  segmentId: string;
  order: number;
}

interface IndexedTranslationUnit extends TranslationUnit {
  unitIndex: number;
}

interface PendingTranslationState {
  freshNodes: Node[];
  prioritizedFreshNodes: Node[];
  streamSegments: PageTranslationSegment[];
  streamSegmentsById: Map<string, PageTranslationSegment>;
}

interface SyncPendingTranslationState {
  freshNodes: Node[];
  unitsToTranslate: IndexedTranslationUnit[];
  unitTranslations: (string | undefined)[];
  nodeUnitIndexes: Map<Node, number[]>;
}

export enum FullPageContextMenuMode {
  OFF = "off",
  ALL_PROVIDERS = "all_providers",
  ACTIVE_PROVIDER = "active_provider",
}

export type PageTranslationStorageSettings = typeof pageTranslationStorage.defaultValue;

export const pageTranslationStorage = createStorage("page_translations", {
  autoLoad: true,
  area: "sync",
  saveDefaultWhenEmpty: true,
  defaultValue: {
    contextMenuMode: FullPageContextMenuMode.ALL_PROVIDERS,
    provider: "google" as ProviderCodeName,
    langFrom: "auto",
    langTo: "en",
    showOriginalOnHover: true,
    showTranslationOnHover: false,
    showTranslationInDOM: true,
    letterCaseAutoCorrection: true, // split content per sentence
    showMore: false,
    alwaysTranslatePages: [] as IObservableArray<string>,
  },
});

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
  protected visibleNodes = observable.set<Node>();
  protected translations = new WeakMap<Node, Record<TranslationHashId, string>>();
  protected originalText = new WeakMap<Node, string>();
  protected originalTextRaw = new WeakMap<Node, string>();
  protected tooltipNodes = new WeakMap<HTMLElement, Set<Text>>();
  protected nodeSegmentBaseIds = new WeakMap<Node, string>();
  protected observedVisibilityTargets = new WeakSet<Element>();
  protected visibilityObserver?: IntersectionObserver;
  protected detectedLangHint?: string;
  protected detectedLangMixed = false;
  protected requestSequence = 0;
  protected isRefreshRunning = false;
  protected refreshRequestedWhileRunning = false;
  protected activeRefreshAbortController?: AbortController;

  constructor(private params: PageTranslatorParams = {}) {
    autoBind(this);
    const {
      sessionCache = true,
      autoTranslateDelayMs = 500,
    } = params;
    this.params = { sessionCache, autoTranslateDelayMs };
  }

  get nodes(): Node[] {
    return this.sortNodesByDomOrder(Array.from(this.nodesAll));
  }

  get settings() {
    return pageTranslationStorage.get();
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
      this.settings.alwaysTranslatePages.replace(Array.from(uniqUrls));
    }
    if (urls.disabled) {
      const translatingUrls = new Set(this.settings.alwaysTranslatePages);
      const excludedUrls = new Set(urls.disabled.map(this.normalizeUrl))
      const uniqUrls = translatingUrls.difference(excludedUrls);
      this.settings.alwaysTranslatePages.replace(Array.from(uniqUrls));
    }
  }

  startAutoTranslation() {
    this.resetDetectedLangHint();
    const nodes = this.collectNodes();
    this.processNodes(nodes);

    this.dispose.push(
      this.bindDOMNodesAutoTranslation(),
      this.bindTranslationOnSettingsChange(),
      this.watchDOMNodeUpdates(),
      () => this.cancelActiveRefresh(),
      () => this.disconnectVisibilityObserver(),
      () => this.clearCollectedNodes(),
    );
  }

  stopAutoTranslation() {
    this.cancelActiveRefresh();
    this.resetDetectedLangHint();
    this.restoreDOM();
    this.dispose();
  }

  protected bindTranslationOnSettingsChange = () => {
    return reaction(() => {
        const { showMore, alwaysTranslatePages, ...settings } = this.settings;
        return settings;
      },
      () => {
        this.cancelActiveRefresh();
        this.resetDetectedLangHint();
        void this.refreshTranslations();
      }
    );
  }

  protected bindDOMNodesAutoTranslation = () => {
    return reaction(() => this.nodes,
      () => {
        void this.refreshTranslations();
      },
      {
        fireImmediately: true,
        delay: this.params.autoTranslateDelayMs,
        equals: comparer.structural,
      }
    );
  }

  protected clearCollectedNodes() {
    this.nodesAll.clear();
    this.visibleNodes.clear();
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
    this.nodesAll.forEach(node => {
      const translation = this.getTranslation(node);
      if (translation) this.updateDOMNode(node, translation);
    });
  }

  restoreDOM() {
    this.logger.info("RESTORE DOM");
    this.nodesAll.forEach(node => {
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

  protected refreshTranslations = debounce(() => {
    void this.runRefreshLoop();
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
    this.observeNodeVisibility(nodes);
  }

  protected ensureVisibilityObserver() {
    if (this.visibilityObserver) {
      return this.visibilityObserver;
    }

    this.visibilityObserver = new IntersectionObserver(entries => {
      let shouldRefresh = false;

      for (const entry of entries) {
        shouldRefresh = this.setTargetVisibility(entry.target as HTMLElement, entry.isIntersecting) || shouldRefresh;
      }

      if (shouldRefresh) {
        void this.refreshTranslations();
      }
    }, {
      rootMargin: "0px 0px 50% 0px",
      threshold: 0,
    });

    return this.visibilityObserver;
  }

  protected disconnectVisibilityObserver() {
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = undefined;
  }

  protected observeNodeVisibility(nodes: Node[]) {
    const visibilityObserver = this.ensureVisibilityObserver();

    nodes.forEach(node => {
      const target = node instanceof Text ? node.parentElement : node as HTMLElement;
      if (!target) {
        return;
      }

      if (!this.observedVisibilityTargets.has(target)) {
        this.observedVisibilityTargets.add(target);
        visibilityObserver.observe(target);
      }

      if (this.isElementNearViewport(target)) {
        this.setTargetVisibility(target, true);
      }
    });
  }

  protected isElementNearViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.bottom >= 0
      && rect.right >= 0
      && rect.top <= viewportHeight * 1.5
      && rect.left <= viewportWidth
    );
  }

  protected setTargetVisibility(target: HTMLElement, isVisible: boolean): boolean {
    if (this.isTranslatableNode(target)) {
      return this.setNodeVisibility(target, isVisible);
    }

    const texts = this.tooltipNodes.get(target);
    let shouldRefresh = false;

    texts?.forEach(text => {
      shouldRefresh = this.setNodeVisibility(text, isVisible) || shouldRefresh;
    });

    return shouldRefresh;
  }

  protected setNodeVisibility(node: Node, isVisible: boolean): boolean {
    if (isVisible) {
      const wasVisible = this.visibleNodes.has(node);
      this.visibleNodes.add(node);
      return !wasVisible && !this.getTranslation(node);
    }

    this.visibleNodes.delete(node);
    return false;
  }

  protected isNodeVisible(node: Node): boolean {
    return this.visibleNodes.has(node);
  }

  protected prioritizeNodes(nodes: Node[]): Node[] {
    return [...nodes].sort((left, right) => {
      return Number(this.isNodeVisible(right)) - Number(this.isNodeVisible(left));
    });
  }

  protected sortNodesByDomOrder(nodes: Node[]): Node[] {
    return [...nodes].sort((left, right) => {
      if (left === right) {
        return 0;
      }

      const position = left.compareDocumentPosition(right);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }

      return 0;
    });
  }

  protected async runRefreshLoop() {
    this.logger.info("REFRESH TRANSLATIONS");

    if (this.isRefreshRunning) {
      this.refreshRequestedWhileRunning = true;
      this.activeRefreshAbortController?.abort();
      return;
    }

    this.isRefreshRunning = true;

    try {
      do {
        this.refreshRequestedWhileRunning = false;

        const abortController = new AbortController();
        this.activeRefreshAbortController = abortController;

        try {
          await this.translateNodes(this.nodes, {
            signal: abortController.signal,
          });
        } catch (err) {
          const isAbortError = abortController.signal.aborted || String(err).toLowerCase().includes("abort");
          if (!isAbortError) {
            this.logger.error(`[REFRESH]: translation loop failed: ${err?.message ?? err}`);
          }
        } finally {
          if (this.activeRefreshAbortController === abortController) {
            this.activeRefreshAbortController = undefined;
          }
        }

        if (!abortController.signal.aborted) {
          this.renderTranslatedNodes({ restoreFirst: true });
        }
      } while (this.refreshRequestedWhileRunning);
    } finally {
      this.isRefreshRunning = false;
    }
  }

  protected cancelActiveRefresh() {
    this.refreshRequestedWhileRunning = false;
    this.activeRefreshAbortController?.abort();
    this.activeRefreshAbortController = undefined;
  }

  protected renderTranslatedNodes({ restoreFirst = false } = {}) {
    queueMicrotask(() => {
      if (restoreFirst) {
        this.restoreDOM();
      }
      this.updateDOM();
    });
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

  protected resetDetectedLangHint() {
    this.detectedLangHint = undefined;
    this.detectedLangMixed = false;
  }

  protected updateDetectedLangHint(detectedLang?: string) {
    if (!detectedLang || this.settings.langFrom !== "auto" || this.detectedLangMixed) {
      return;
    }

    if (!this.detectedLangHint) {
      this.detectedLangHint = detectedLang;
      return;
    }

    if (this.detectedLangHint !== detectedLang) {
      this.detectedLangHint = undefined;
      this.detectedLangMixed = true;
    }
  }

  protected getEffectiveLangFrom(): string {
    if (this.settings.langFrom !== "auto") {
      return this.settings.langFrom;
    }

    return this.detectedLangHint ?? this.settings.langFrom;
  }

  protected getPageId(): string {
    return `page_${md5(document.URL)}`;
  }

  protected createRequestId(): string {
    this.requestSequence += 1;
    return `req_${this.requestSequence}_${Date.now().toString(36)}`;
  }

  protected getNodeSegmentPath(node: Node): string {
    const path: string[] = [];
    let current: Node | null = node instanceof Text ? node.parentNode : node;

    while (current && current !== document.body && path.length < 4) {
      const parent = current.parentNode;
      const siblingIndex = parent ? Array.from(parent.childNodes).indexOf(current as ChildNode) : 0;
      const nodeName = current instanceof Element
        ? current.tagName.toLowerCase()
        : current.nodeName.toLowerCase();

      path.unshift(`${nodeName}:${siblingIndex}`);
      current = parent;
    }

    return path.join("/");
  }

  protected getNodeSegmentBaseId(node: Node): string {
    const existingId = this.nodeSegmentBaseIds.get(node);
    if (existingId) {
      return existingId;
    }

    const originalText = this.originalTextRaw.get(node) ?? this.originalText.get(node) ?? "";
    const segmentBaseId = `seg_${md5([
      document.URL,
      this.getNodeSegmentPath(node),
      originalText,
    ].join("|"))}`;

    this.nodeSegmentBaseIds.set(node, segmentBaseId);
    return segmentBaseId;
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
      const segmentBaseId = this.getNodeSegmentBaseId(node);

      textChunks.forEach((text, partIndex) => {
        units.push({
          node,
          text,
          segmentId: textChunks.length > 1
            ? `${segmentBaseId}_${partIndex + 1}`
            : segmentBaseId,
          partIndex,
          partCount: textChunks.length,
        });
      });
    }

    return units;
  }

  protected createPageSegments(nodes: Node[]): PageTranslationSegment[] {
    return nodes.flatMap((node, order) => {
      const originalText = this.originalText.get(node);
      if (!originalText) {
        return [];
      }

      return [{
        node,
        text: originalText,
        segmentId: this.getNodeSegmentBaseId(node),
        order,
      }];
    });
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

  protected preparePendingTranslations(nodes: Node[], providerId: TranslationHashId): PendingTranslationState {
    const freshNodes = nodes.filter(node => !this.getTranslation(node, providerId));
    const prioritizedFreshNodes = this.prioritizeNodes(freshNodes);

    freshNodes.forEach(node => this.importNode(node));

    const streamSegments = this.createPageSegments(freshNodes);
    const streamSegmentsById = new Map(
      streamSegments.map(segment => [segment.segmentId, segment] as const)
    );

    return {
      freshNodes,
      prioritizedFreshNodes,
      streamSegments,
      streamSegmentsById,
    };
  }

  protected prepareSyncPendingTranslations(nodes: Node[], providerId: TranslationHashId): SyncPendingTranslationState {
    const freshNodes = this.prioritizeNodes(nodes)
      .filter(node => !this.getTranslation(node, providerId));

    const units = this.createTranslationUnits(freshNodes);
    const unitTranslations: (string | undefined)[] = new Array(units.length);
    const unitsToTranslate: IndexedTranslationUnit[] = [];
    const nodeUnitIndexes = new Map<Node, number[]>();

    units.forEach((unit, unitIndex) => {
      const unitIndexes = nodeUnitIndexes.get(unit.node) ?? [];
      unitIndexes.push(unitIndex);
      nodeUnitIndexes.set(unit.node, unitIndexes);

      const cachedTranslation = this.params.sessionCache ? this.getStorageCacheByText(unit.text, providerId) : undefined;
      if (cachedTranslation !== undefined && cachedTranslation !== null) {
        unitTranslations[unitIndex] = cachedTranslation;
        return;
      }

      unitsToTranslate.push({ ...unit, unitIndex });
    });

    return {
      freshNodes,
      unitsToTranslate,
      unitTranslations,
      nodeUnitIndexes,
    };
  }

  protected getPendingUnits(state: SyncPendingTranslationState): IndexedTranslationUnit[] {
    return state.unitsToTranslate.filter(unit => state.unitTranslations[unit.unitIndex] === undefined);
  }

  protected applyUnitTranslations(
    units: IndexedTranslationUnit[],
    translations: string[],
    state: SyncPendingTranslationState,
    providerId: TranslationHashId,
  ) {
    const cacheTexts: string[] = [];
    const cacheTranslations: string[] = [];

    units.forEach((unit, translationIndex) => {
      const translation = translations[translationIndex];
      if (translation === undefined) {
        return;
      }

      state.unitTranslations[unit.unitIndex] = translation;

      if (this.params.sessionCache) {
        cacheTexts.push(unit.text);
        cacheTranslations.push(translation);
      }
    });

    if (this.params.sessionCache && cacheTexts.length) {
      this.saveStorageCacheByText(cacheTexts, cacheTranslations, providerId);
    }
  }

  protected commitResolvedSyncNodes(state: SyncPendingTranslationState, providerId: TranslationHashId): Node[] {
    const resolvedNodes: Node[] = [];
    const cacheTexts: string[] = [];
    const cacheTranslations: string[] = [];

    state.freshNodes.forEach(node => {
      const existingTranslation = this.translations.get(node)?.[providerId];
      if (existingTranslation) {
        return;
      }

      const unitIndexes = state.nodeUnitIndexes.get(node) ?? [];
      if (!unitIndexes.length) {
        return;
      }

      const parts = unitIndexes.map(unitIndex => state.unitTranslations[unitIndex]);
      if (parts.some(part => part === undefined)) {
        return;
      }

      const translation = parts.join("");
      const nodeTranslations = this.translations.get(node) ?? {} as Record<TranslationHashId, string>;
      nodeTranslations[providerId] = translation;
      this.translations.set(node, nodeTranslations);
      resolvedNodes.push(node);

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

    return resolvedNodes;
  }

  protected setResolvedNodeTranslation(node: Node, translation: string, providerId: TranslationHashId): boolean {
    if (translation === undefined) {
      return false;
    }

    const existingTranslation = this.translations.get(node)?.[providerId];
    if (existingTranslation === translation) {
      return false;
    }

    const nodeTranslations = this.translations.get(node) ?? {} as Record<TranslationHashId, string>;
    nodeTranslations[providerId] = translation;
    this.translations.set(node, nodeTranslations);

    if (this.params.sessionCache) {
      const originalText = this.originalText.get(node);
      if (originalText) {
        this.saveStorageCacheByText([originalText], [translation], providerId);
      }
    }

    return true;
  }

  protected handleStreamBatchDone(
    batch: XTranslateProTranslateStreamBatchDoneEvent,
    state: PendingTranslationState,
    providerId: TranslationHashId,
  ) {
    const resolvedNodes: Node[] = [];

    batch.items.forEach(item => {
      const segment = state.streamSegmentsById.get(item.id);
      if (!segment) {
        return;
      }

      if (this.setResolvedNodeTranslation(segment.node, item.translation, providerId)) {
        resolvedNodes.push(segment.node);
      }
    });

    if (resolvedNodes.length) {
      this.renderTranslatedNodes();
    }
  }

  protected async streamTranslateUnits(
    state: PendingTranslationState,
    providerId: TranslationHashId,
    signal?: AbortSignal,
  ) {
    if (this.settings.provider !== ProviderCodeName.XTRANSLATE_PRO) {
      return;
    }

    const pendingSegments = state.streamSegments.filter(segment => !this.getTranslation(segment.node, providerId));
    if (!pendingSegments.length || signal?.aborted) {
      return;
    }

    const requestId = this.createRequestId();
    const requestedLangFrom = this.getEffectiveLangFrom();

    try {
      await getXTranslatePro().streamPageTranslation({
        langFrom: requestedLangFrom,
        langTo: this.settings.langTo,
        mode: "page",
        page: {
          page_id: this.getPageId(),
          request_id: requestId,
          url: document.URL,
          title: document.title,
        },
        segments: pendingSegments.map(segment => ({
          id: segment.segmentId,
          text: segment.text,
          order: segment.order,
          visible: this.isNodeVisible(segment.node),
        })),
      }, {
        signal,
        onStarted: (event) => {
          this.logger.info("[STREAM] job_started", event);
        },
        onBatchDone: (batch) => {
          this.updateDetectedLangHint(batch.detectedLang);
          this.handleStreamBatchDone(batch, state, providerId);
        },
        onStats: (stats) => {
          this.logger.info("[STREAM] job_stats", stats);
        },
        onCompleted: (event) => {
          this.logger.info("[STREAM] job_completed", event);
        },
        onError: (event) => {
          this.logger.error(`[STREAM] ${event.code}: ${event.message}`);
        },
      });
    } catch (err) {
      const isAbortError = signal?.aborted || String(err).toLowerCase().includes("abort");
      if (!isAbortError) {
        this.logger.error(`[STREAM]: page translation stream failed: ${err?.message ?? err}`);
      }
    }
  }

  protected async syncTranslateUnits(
    nodes: Node[],
    providerId: TranslationHashId,
    signal?: AbortSignal,
  ) {
    if (this.settings.provider === ProviderCodeName.XTRANSLATE_PRO) {
      await this.syncTranslateSegments(nodes, providerId, signal);
      return;
    }

    const state = this.prepareSyncPendingTranslations(nodes, providerId);
    const pendingUnits = this.getPendingUnits(state);
    if (!pendingUnits.length) {
      return;
    }

    const packedUnits = this.packTranslationUnits(pendingUnits);

    for (const pack of packedUnits) {
      if (signal?.aborted) {
        return;
      }

      const { translation, detectedLang } = await this.translateSyncBatchRequest(pack);
      this.updateDetectedLangHint(detectedLang);
      this.applyUnitTranslations(pack, translation, state, providerId);

      const resolvedNodes = this.commitResolvedSyncNodes(state, providerId);
      if (resolvedNodes.length) {
        this.renderTranslatedNodes();
      }
    }
  }

  protected async syncTranslateSegments(
    nodes: Node[],
    providerId: TranslationHashId,
    signal?: AbortSignal,
  ) {
    const segments = this.createPageSegments(nodes.filter(node => !this.getTranslation(node, providerId)));
    if (!segments.length) {
      return;
    }

    if (signal?.aborted) {
      return;
    }

    const { translation, detectedLang } = await this.translateSyncSegmentsRequest(segments);
    this.updateDetectedLangHint(detectedLang);

    const resolvedNodes: Node[] = [];
    segments.forEach((segment, index) => {
      if (this.setResolvedNodeTranslation(segment.node, translation[index], providerId)) {
        resolvedNodes.push(segment.node);
      }
    });

    if (resolvedNodes.length) {
      this.renderTranslatedNodes();
    }
  }

  protected async translateNodes(
    nodes = this.nodes,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<string[]> {
    const providerId = this.getProviderHashId();
    const state = this.preparePendingTranslations(nodes, providerId);

    if (!state.freshNodes.length) {
      return [];
    }

    this.logger.info("TRANSLATING NODES", {
      nodes: state.prioritizedFreshNodes,
      visible: state.freshNodes.filter(node => this.isNodeVisible(node)).length,
      hidden: state.freshNodes.filter(node => !this.isNodeVisible(node)).length,
    });

    if (signal?.aborted) {
      return [];
    }

    await this.streamTranslateUnits(state, providerId, signal);

    if (signal?.aborted) {
      return [];
    }

    const unresolvedNodes = state.freshNodes.filter(node => !this.getTranslation(node, providerId));
    await this.syncTranslateUnits(unresolvedNodes, providerId, signal);

    return state.freshNodes
      .map(node => this.getTranslation(node, providerId))
      .filter(Boolean);
  }

  async translateSyncBatchRequest(units: Pick<TranslationUnit, "text" | "segmentId">[]): Promise<{ translation: string[], detectedLang?: string }> {
    return this.translateSyncTextsRequest(units);
  }

  async translateSyncSegmentsRequest(segments: Pick<PageTranslationSegment, "text" | "segmentId">[]): Promise<{ translation: string[], detectedLang?: string }> {
    return this.translateSyncTextsRequest(segments);
  }

  protected async translateSyncTextsRequest(
    entries: Array<Pick<TranslationUnit, "text" | "segmentId"> | Pick<PageTranslationSegment, "text" | "segmentId">>
  ): Promise<{ translation: string[], detectedLang?: string }> {
    const { provider, langTo } = this.settings;
    const translator = getTranslator(provider);
    const texts = entries.map(entry => entry.text);
    const requestedLangFrom = this.getEffectiveLangFrom();

    try {
      const batchResult = await translator.translateBatch({
        from: requestedLangFrom,
        to: langTo,
        texts,
        mode: "page",
        client: {
          request_id: this.createRequestId(),
          page_id: this.getPageId(),
          segment_ids: entries.map(entry => entry.segmentId),
        },
      });

      const preview = texts.map((originalText, i) => [originalText, batchResult.translation[i]]);
      this.logger.info(`TRANSLATED TEXTS: ${texts.length}`, {
        result: preview,
        langFromRequested: requestedLangFrom,
        detectedLang: batchResult.detectedLang,
      });

      return batchResult;
    } catch (err) {
      this.logger.error(`TRANSLATION FAILED: ${err?.message}`);
    }

    return { translation: [] };
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
