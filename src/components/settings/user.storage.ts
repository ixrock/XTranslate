import { makeObservable } from "mobx";
import { createStorage } from "@/storage";
import { getXTranslatePro, XTranslateProUser } from "@/providers";
import { formatPrice } from "@/utils";
import { getLocale } from "@/i18n";

export const userSubscriptionStorage = createStorage("user", {
  area: "local",
  autoLoad: false,
  defaultValue: {} as Partial<XTranslateProUser>,
});

export class UserSubscriptionStore {
  public pricePerMonthUSDCents = 799;

  constructor() {
    makeObservable(this);
    void this.load();
  }

  async load() {
    await userSubscriptionStorage.load();
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
    return userSubscriptionStorage.get();
  }

  get subscriptionPlan() {
    return this.data?.subscription?.planType;
  }

  get isProEnabled() {
    return this.data?.subscription?.status === "active";
  }

  get remainTextTokens(): number {
    return this.data?.subscription?.tokensRemain;
  }

  get remainSecondsTTSRoughly(): number {
    const bytesAvailable = this.data?.subscription?.ttsBytesRemain ?? 0;

    return Math.round(bytesAvailable / 16000); // ~mp3/128KBps
  }

  async refreshFromServer(): Promise<XTranslateProUser> {
    try {
      const userInfo = await this.apiProvider.getUser();
      userSubscriptionStorage.set(userInfo);
      return userInfo;
    } catch (err) {
      userSubscriptionStorage.reset();
      return;
    }
  }
}

export const userSubscriptionStore = new UserSubscriptionStore();