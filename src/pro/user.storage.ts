import { action } from "mobx";
import { createStorage } from "@/storage";
import { getXTranslatePro, XTranslateProPricing, XTranslateProSubscription, XTranslateProTranslateError, XTranslateProUser } from "@/providers";
import { MessageType, sendMessage } from "@/extension";
import { formatPrice } from "@/utils";
import { getLocale, getMessage } from "@/i18n";

export interface UserStorage {
  user?: XTranslateProUser;
  subscription?: XTranslateProSubscription;
  pricing?: XTranslateProPricing;
  lastUpdateDateTime?: number;
  promoBannerShowTime?: number;
}

const userStorage = createStorage<UserStorage>("user_pro", {
  area: "local",
  autoLoad: true,
  defaultValue: {
    user: null,
    pricing: null,
    lastUpdateDateTime: 0,
    promoBannerShowTime: 0,
  },
});

export class UserStore {
  private storage = userStorage;
  private refreshPromise: Promise<any> = null;

  get apiProvider() {
    return getXTranslatePro();
  }

  get data() {
    return this.storage.get();
  }

  get user(): XTranslateProUser | null {
    return this.data.user;
  }

  get subscription(): XTranslateProSubscription | null {
    return this.data.subscription;
  }

  get pricing(): XTranslateProPricing | null {
    return this.data.pricing;
  }

  get pricePerMonth() {
    return this.formatPrice(this.pricing?.MONTHLY.priceCentsUSD ?? 0);
  }

  get isGuestUser(): boolean {
    return !this.user && !this.subscription;
  }

  get isFreeUser(): boolean {
    return this.subscription?.planType === "FREE_PLAN";
  }

  get isPaidUser(): boolean {
    const planType = this.subscription?.planType;
    return planType === "MONTHLY" || planType === "YEARLY";
  }

  get isProActive(): boolean {
    if (!this.user || !this.subscription) return false;

    return !this.isProExpired && this.subscription.status === "active";
  }

  get isProExpired(): boolean {
    const expiryTime = new Date(this.subscription?.periodEnd).getTime();

    return expiryTime > 0 && expiryTime < Date.now();
  }

  get remainTextTokens(): number {
    return this.subscription?.tokensRemain;
  }

  get remainSecondsTTSRoughly(): number {
    const bytesAvailable = this.subscription?.ttsBytesRemain ?? 0;

    return Math.round(bytesAvailable / 16000); // ~mp3/128KBps
  }

  get isPromoVisible() {
    if (userStore.isProActive) return false;

    const promoSkippedLastTime = this.data.promoBannerShowTime;
    const remindPromoDelay = 2 * 30 * 24 * 60 * 60 * 1000; // every 2 months

    return !promoSkippedLastTime || (
      promoSkippedLastTime + remindPromoDelay <= Date.now()
    );
  }

  private formatPrice(cents = 0) {
    return formatPrice({
      value: cents / 100,
      currency: "USD",
      locale: getLocale(),
    });
  }

  async initContentScript() {
    return sendMessage({
      type: MessageType.USER_DATA_UPDATE_REQUEST,
    });
  }

  async refreshPricing() {
    try {
      const pricing = await this.apiProvider.loadPricing();
      this.storage.merge({ pricing });
    } catch (err) {
    }
  }

  async refreshSubscription() {
    try {
      const user = await this.apiProvider.loadUser();
      const subscription = await this.apiProvider.loadSubscription();

      this.storage.merge({
        user,
        subscription,
        lastUpdateDateTime: Date.now(),
      });
    } catch (err) {
      const { statusCode } = err as XTranslateProTranslateError;
      if (statusCode === 401) {
        this.storage.merge({
          user: null,
          subscription: null,
          lastUpdateDateTime: Date.now(),
        });
      }
    }
  }

  private async safeLoadWithPromiseDedupe(callback: () => Promise<any>) {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        return await callback();
      } catch (err) {
        throw err;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  @action
  async load(): Promise<void> {
    return this.safeLoadWithPromiseDedupe(async () => {
      await this.storage.load();
      if (!this.pricing) await this.refreshPricing();
      await this.refreshSubscription();
    })
  }

  async refreshFromContentScript() {
    return this.safeLoadWithPromiseDedupe(async () => {
      await this.storage.load();

      const { pricing, lastUpdateDateTime } = this.data;
      const isFirstUpdate = lastUpdateDateTime === 0;
      const freeUserRefreshTimeMs = 30 * 24 * 3600 * 1000; // 1 month
      const paidUserRefreshTimeMs = 24 * 3600 * 1000; // 1 day

      try {
        if (!pricing) {
          await this.refreshPricing();
        }

        const updateRequired = [
          isFirstUpdate,
          this.isFreeUser && (lastUpdateDateTime + freeUserRefreshTimeMs < Date.now()),
          this.isPaidUser && (lastUpdateDateTime + paidUserRefreshTimeMs < Date.now())
        ].some(v => v);

        if (updateRequired) {
          await this.refreshSubscription();
        }
      } catch (err) {
        const { statusCode } = err as XTranslateProTranslateError;
        if (statusCode === 401) {
          this.storage.merge({ lastUpdateDateTime: Date.now() });
        }
      }
    });
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