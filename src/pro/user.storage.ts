import { action, makeObservable, observable } from "mobx";
import { createStorage } from "@/storage";
import { getXTranslatePro, XTranslateProPricing, XTranslateProTranslateError, XTranslateProUser } from "@/providers";
import { formatPrice } from "@/utils";
import { getLocale } from "@/i18n";

export interface UserStorage {
  user?: XTranslateProUser;
  pricing?: XTranslateProPricing;
  preloadLastTime?: number;
}

export const userStorage = createStorage<UserStorage>("user_storage", {
  area: "local",
  autoLoad: true,
  defaultValue: {
    user: null,
    pricing: null,
    preloadLastTime: 0,
  },
});

export class UserSubscriptionStore {
  @observable pricing = {} as XTranslateProPricing;

  constructor() {
    makeObservable(this);
    userStorage.whenReady.then(() => this.load());
  }

  async load() {
    await this.refreshFromServer();
  }

  get apiProvider() {
    return getXTranslatePro();
  }

  get pricePerMonth() {
    return this.getPriceFormatted(this.pricing.MONTHLY?.priceCentsUSD ?? 0);
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

  get isProActive(): boolean {
    return this.isProEnabled
      && !this.isProExpired
      && this.user.subscription?.status === 'active';
  }

  get isProExpired(): boolean {
    const expiryTime = new Date(this.user?.subscription.periodEnd).getTime();

    return expiryTime > 0 && expiryTime < Date.now();
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
  async refreshFromServer(): Promise<void> {
    await userStorage.load();

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