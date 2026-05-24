import adBrands from "./ad-brands.json";
import adMessages from "./ad-messages.json";
import { getTranslator, ProviderCodeName } from "@/providers";
import { createStorage } from "@/storage";
import { getLocale, Locale } from "@/i18n";

export const CONTEXT_MAX_CHARS = 500;
export const CONTEXT_SOFT_MIN_CHARS = 300;
export const MAX_BRAND_SHOWS_PER_DAY = 3;

type AdBrand = (typeof adBrands.brands)[number];
type AdBrandName = AdBrand["name"];
type AdMessages = Record<AdBrandName, Record<Locale, string[]>>;

export interface AdBrandDailyStats {
  shownCount: number;
  usedMessageIndexes: number[];
}

export interface AdContextDailyState {
  dayKey: string;
  brands: Record<AdBrandName, AdBrandDailyStats>;
}

export interface AdContextStoreModel {
  anonId: string;
  daily: AdContextDailyState;
}

export interface ContextAd {
  brand: AdBrandName;
  title: string;
  url: string;
}

export interface AdScore {
  brand: AdBrand;
  score: number;
  matchedWeightSum: number;
  totalPossibleWeight: number;
  negativePenalty: number;
  matchedKeywords: string[];
  matchedNegativeKeywords: string[];
}

const messages = adMessages as AdMessages;
const adScoring = adBrands.scoring;

function getAnonId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).substring(2);
}

function getDefaultAdContextStore(): AdContextStoreModel {
  return {
    anonId: getAnonId(),
    daily: {
      dayKey: getDayKey(),
      brands: {},
    },
  };
}

export const adContextStore = createStorage<AdContextStoreModel>("ad_context_store", {
  autoLoad: true,
  saveDefaultWhenEmpty: true,
  defaultValue: getDefaultAdContextStore(),
});

export interface AdLookupInput {
  sourceLang: string;
  targetLang: string;
  text: string;
}

export async function getContextInEnglish(input: AdLookupInput): Promise<string> {
  const text = trimContextText(input.text);

  if (!text) {
    return "";
  }

  if (isEnglishLang(input.sourceLang)) {
    return text;
  }

  return translateContextToEnglish(text);
}

export function getContextAd(enContext: string): ContextAd | null {
  const context = trimContextText(enContext);

  if (!context) {
    return null;
  }

  const locale = getLocale();
  const candidates = getAdScores(context)
    .filter(({ score, matchedWeightSum }) => {
      return matchedWeightSum >= adScoring.minMatchedWeight
        && score >= adScoring.showThreshold;
    })
    .sort((a, b) => {
      return b.score - a.score
        || b.matchedWeightSum - a.matchedWeightSum
        || adBrands.brands.indexOf(a.brand) - adBrands.brands.indexOf(b.brand);
    });

  for (const { brand } of candidates) {
    const brandMessages = getBrandMessages(brand.name, locale);
    if (!brandMessages.length) continue;

    const availableMessageIndexes = getAvailableMessageIndexes(brand.name, brandMessages.length);
    if (!availableMessageIndexes.length) continue;

    const messageIndex = pickRandomItem(availableMessageIndexes);
    registerBrandShown(brand.name, messageIndex);

    return {
      brand: brand.name,
      title: brandMessages[messageIndex],
      url: brand.linkUrl.trim(),
    };
  }

  return null;
}

export function hasAvailableContextAd(): boolean {
  const locale = getLocale();

  return adBrands.brands.some((brand) => {
    const brandMessages = getBrandMessages(brand.name, locale);
    if (!brandMessages.length) return false;

    return getAvailableMessageIndexes(brand.name, brandMessages.length).length > 0;
  });
}

export function trimContextText(text: string): string {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (normalizedText.length <= CONTEXT_MAX_CHARS) {
    return normalizedText;
  }

  const slice = normalizedText.slice(0, CONTEXT_MAX_CHARS);
  const softSlice = slice.slice(CONTEXT_SOFT_MIN_CHARS);
  const softBoundaryIndex = softSlice.search(/[\s.,;:!?)]/);

  if (softBoundaryIndex >= 0) {
    return slice.slice(0, CONTEXT_SOFT_MIN_CHARS + softBoundaryIndex).trim();
  }

  const lastWhitespaceIndex = slice.lastIndexOf(" ");
  if (lastWhitespaceIndex >= CONTEXT_SOFT_MIN_CHARS) {
    return slice.slice(0, lastWhitespaceIndex).trim();
  }

  return slice.trim();
}

export function getAdScores(enContext: string): AdScore[] {
  const normalizedContext = normalizeForMatching(enContext);

  return adBrands.brands.map((brand) => getAdScore(brand, normalizedContext));
}

export function getDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isEnglishLang(lang: string): boolean {
  return /^en(?:$|[-_])/i.test(lang);
}

async function translateContextToEnglish(text: string): Promise<string> {
  const providers = [
    getTranslator(ProviderCodeName.GOOGLE),
    getTranslator(ProviderCodeName.BING),
  ].filter(Boolean);

  for (const translator of providers) {
    try {
      const result = await translator.translate({
        internal: true,
        from: "auto",
        to: "en",
        text,
      });
      const translation = trimContextText(result.translation);

      if (translation) {
        return translation;
      }
    } catch {
      // Try the next free translation provider.
    }
  }

  return "";
}

function getAdScore(brand: AdBrand, normalizedContext: string): AdScore {
  const totalPossibleWeight = brand.keywords.reduce((sum, { weight }) => sum + weight, 0);
  const matchedKeywords = brand.keywords.filter(({ word }) => includesKeyword(normalizedContext, word));
  const matchedNegativeKeywords = brand.negativeKeywords.filter((word) => includesKeyword(normalizedContext, word));
  const matchedWeightSum = matchedKeywords.reduce((sum, { weight }) => sum + weight, 0);
  const negativePenalty = matchedNegativeKeywords.length * adScoring.negativePenaltyPerMatch;
  const score = brand.base + (Math.sqrt(matchedWeightSum) * 2) - negativePenalty;

  return {
    brand,
    score,
    matchedWeightSum,
    totalPossibleWeight,
    negativePenalty,
    matchedKeywords: matchedKeywords.map(({ word }) => word),
    matchedNegativeKeywords,
  };
}

function normalizeForMatching(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesKeyword(normalizedContext: string, keyword: string): boolean {
  const normalizedKeyword = normalizeForMatching(keyword);
  if (!normalizedKeyword) return false;

  if (normalizedKeyword.includes(" ")) {
    return normalizedContext.includes(normalizedKeyword);
  }

  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}s?($|[^a-z0-9])`, "i").test(normalizedContext);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getBrandMessages(brandName: AdBrandName, locale: Locale): string[] {
  const brandMessages = messages[brandName];
  if (!brandMessages) return [];

  const normalizedLocale = locale.replace("-", "_") as Locale;
  const shortLocale = normalizedLocale.split("_")[0] as Locale;

  return brandMessages[locale]
    ?? brandMessages[normalizedLocale]
    ?? brandMessages[shortLocale]
    ?? brandMessages.en
    ?? [];
}

function getAvailableMessageIndexes(brandName: AdBrandName, messagesCount: number): number[] {
  const { stats } = getBrandStats(brandName);
  if (stats.shownCount >= MAX_BRAND_SHOWS_PER_DAY) return [];

  const usedMessageIndexes = new Set(stats.usedMessageIndexes);
  return Array.from({ length: messagesCount }, (_, index) => index)
    .filter((index) => !usedMessageIndexes.has(index));
}

function getBrandStats(brandName: AdBrandName) {
  const state = adContextStore.toJS();
  const dayKey = getDayKey();
  const daily = state.daily?.dayKey === dayKey
    ? state.daily
    : {
      dayKey,
      brands: {},
    };

  return {
    state,
    daily,
    stats: daily.brands[brandName] ?? {
      shownCount: 0,
      usedMessageIndexes: [],
    },
  };
}

function registerBrandShown(brandName: AdBrandName, messageIndex: number): void {
  const { state, daily, stats } = getBrandStats(brandName);
  const usedMessageIndexes = Array.from(new Set([...stats.usedMessageIndexes, messageIndex]));

  adContextStore.set({
    ...state,
    daily: {
      ...daily,
      brands: {
        ...daily.brands,
        [brandName]: {
          shownCount: stats.shownCount + 1,
          usedMessageIndexes,
        },
      },
    },
  });
}

function pickRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
