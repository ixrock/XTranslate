import { makeObservable } from "mobx";
import { createStorage } from "@/storage";
import { getXTranslatePro, XTranslateProUser } from "@/providers";
import { formatPrice } from "@/utils";
import { getLocale } from "@/i18n";

export const userStorage = createStorage("user", {
  area: "local",
  autoLoad: false,
  defaultValue: {} as XTranslateProUser,
});

export class UserSubscriptionStore {
  public pricePerMonthUSDCents = 799;

  constructor() {
    makeObservable(this);
  }

  async load() {
    await userStorage.load();
    await this.refreshFromServer();
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
    return userStorage.get();
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
    return userSubscriptionStore.data;
  }

  async refreshFromServer(): Promise<XTranslateProUser> {
    try {
      const userInfo = await this.apiProvider.getUser();
      userStorage.set(userInfo);
      return userInfo;
    } catch (err) {
      console.log('failed to update from server: ', err)
      return this.resetCache();
    }
  }
}

export const userSubscriptionStore = new UserSubscriptionStore();