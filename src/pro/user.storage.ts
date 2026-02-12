import { action } from "mobx";
import { createStorage } from "@/storage";
import { getXTranslatePro, XTranslateProPricing, XTranslateProTranslateError, XTranslateProUser } from "@/providers";
import { MessageType, sendMessage } from "@/extension";
import { formatPrice } from "@/utils";
import { getLocale, getMessage } from "@/i18n";

export interface UserStorage {
  user?: XTranslateProUser;
  pricing?: XTranslateProPricing;
  lastUpdatedTime?: number;
}

export const userStorage = createStorage<UserStorage>("user_storage", {
  area: "local",
  autoLoad: true,
  defaultValue: {
    user: null,
    pricing: null,
    lastUpdatedTime: 0,
  },
});

export class UserStore {
  private isRefreshing = false;

  async load() {
    await userStorage.load();

    return sendMessage({
      type: MessageType.USER_DATA_UPDATE_REQUEST,
    });
  }

  // TODO: maybe provide some global settings from backend server, e.g. `/api/translator-settings`
  //  e.g. for faster switching extension-settings without re-upload new version to CWS (what might be useful in cases like caching)
  get isStale() {
    const cacheWindowMs = 24 * 3600 * 1000; // 1 day
    const { lastUpdatedTime } = userStorage.get();
    return !lastUpdatedTime || (lastUpdatedTime + cacheWindowMs < Date.now());
  }

  get apiProvider() {
    return getXTranslatePro();
  }

  get pricePerMonth() {
    const { pricing } = userStorage.get();
    return this.formatPrice(pricing?.MONTHLY.priceCentsUSD ?? 0);
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
      && this.user.subscription?.status === "active";
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

  private formatPrice(cents = 0) {
    return formatPrice({
      value: cents / 100,
      currency: "USD",
      locale: getLocale(),
    });
  }

  @action
  async refreshFromServer(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      const { user, pricing } = await this.apiProvider.getUser();
      userStorage.set({
        user,
        pricing,
        lastUpdatedTime: Date.now(),
      });
    } catch (err: XTranslateProTranslateError | unknown) {
      userStorage.reset();

      const apiError = err as XTranslateProTranslateError;

      if (apiError.pricing) {
        userStorage.merge({ pricing: apiError.pricing });
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  subscribeSuggestionDialog(): boolean {
    const subscribe = window.confirm(getMessage("pro_required_confirm_goto_subscribe"));

    if (subscribe) {
      window.open(this.apiProvider.subscribePageUrl, "_blank");
      return true;
    }
  }
}

export const userStore = new UserStore();