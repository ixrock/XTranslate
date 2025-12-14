import { action, makeObservable, observable } from "mobx";
import { createStorage } from "@/storage";
import { getXTranslatePro, XTranslatePricing, XTranslateProTranslateError, XTranslateProUser } from "@/providers";
import { formatPrice } from "@/utils";
import { getLocale } from "@/i18n";

export interface UserStorage {
  user?: XTranslateProUser;
  pricing?: XTranslatePricing;
  preloadLastTime?: number;
}

export const userStorage = createStorage<UserStorage>("user_storage", {
  area: "local",
  autoLoad: false,
  defaultValue: {
    user: null,
    pricing: null,
    preloadLastTime: 0,
  },
});

export class UserSubscriptionStore {
  @observable pricing = {} as XTranslatePricing;

  constructor() {
    makeObservable(this);
  }

  async load({ force = false } = {}) {
    await this.refreshFromServer({ force });
  }

  get apiProvider() {
    return getXTranslatePro();
  }

  get pricePerMonth() {
    return this.getPriceFormatted(this.pricing.monthlyPriceCentsUSD ?? 0);
  }

  get pricePerYear() {
    return this.getPriceFormatted(this.pricing.yearlyPriceCentsUSD ?? 0);
  }

  get user(): XTranslateProUser {
    return userStorage.get().user;
  }

  get subscriptionPlan(): string {
    return this.user?.subscription?.planType;
  }

  get isProEnabled(): boolean {
    return Boolean(this.user?.subscription);
  }

  get remainTextTokens(): number {
    return this.user?.subscription?.tokensRemain;
  }

  get remainSecondsTTSRoughly(): number {
    const bytesAvailable = this.user?.subscription?.ttsBytesRemain ?? 0;

    return Math.round(bytesAvailable / 16000); // ~mp3/128KBps
  }

  private getPriceFormatted(priceUSDCents = 0) {
    return formatPrice({
      value: priceUSDCents / 100,
      currency: "USD",
      locale: getLocale(),
    });
  }

  resetCache() {
    userStorage.reset();
  }

  @action
  async refreshFromServer({ force = false } = {}): Promise<void> {
    await userStorage.load();

    const hasData = Boolean(this.user || this.pricing);
    if (hasData && !force) {
      return; // return cache from chrome.storage.local
    }

    try {
      const { user, pricing } = await this.apiProvider.getUser();
      this.pricing = pricing;
      userStorage.set({
        user,
        pricing,
        preloadLastTime: Date.now(),
      });
    } catch (err: XTranslateProTranslateError | unknown) {
      const apiError = err as XTranslateProTranslateError;

      if (apiError.pricing) {
        this.pricing = apiError.pricing;
        userStorage.merge({
          pricing: apiError.pricing,
        });
      }
      console.log('failed to update from server: ', err)
      this.resetCache();
    }
  }
}

export const userStore = new UserSubscriptionStore();