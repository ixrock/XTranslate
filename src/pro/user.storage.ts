import { makeObservable } from "mobx";
import { createStorage } from "@/storage";
import { getXTranslatePro, XTranslateProUser } from "@/providers";
import { formatPrice } from "@/utils";
import { getLocale } from "@/i18n";

export interface UserStorage {
  user?: XTranslateProUser;
  preloadLastTime?: number;
}

export const userStorage = createStorage<UserStorage>("user_storage", {
  area: "local",
  autoLoad: false,
  defaultValue: {
    user: null,
    preloadLastTime: 0,
  },
});

export class UserSubscriptionStore {
  public pricePerMonthUSDCents = 799; // TODO: took from user APIs

  constructor() {
    makeObservable(this);
  }

  async load({ force = false } = {}) {
    await this.refreshFromServer({ force });
  }

  get apiProvider() {
    return getXTranslatePro();
  }

  get priceFormattedPerMonth() {
    return formatPrice({
      value: this.pricePerMonthUSDCents / 100,
      currency: "USD",
      locale: getLocale(),
    });
  }

  get data() {
    return userStorage.get().user;
  }

  get subscriptionPlan(): string {
    return this.data?.subscription?.planType;
  }

  get isProEnabled(): boolean {
    return Boolean(this.data?.subscription);
  }

  get remainTextTokens(): number {
    return this.data?.subscription?.tokensRemain;
  }

  get remainSecondsTTSRoughly(): number {
    const bytesAvailable = this.data?.subscription?.ttsBytesRemain ?? 0;

    return Math.round(bytesAvailable / 16000); // ~mp3/128KBps
  }

  resetCache() {
    userStorage.reset();
    return userStore.data;
  }

  async refreshFromServer({ force = false } = {}): Promise<void> {
    await userStorage.load();

    const hasUserData = Boolean(userStore.data);
    if (hasUserData && !force) {
      return; // return cache from chrome.storage.local
    }

    try {
      const userInfo = await this.apiProvider.getUser();
      userStorage.set({
        user: userInfo,
        preloadLastTime: Date.now(),
      });
    } catch (err) {
      console.log('failed to update from server: ', err)
      this.resetCache();
    }
  }
}

export const userStore = new UserSubscriptionStore();