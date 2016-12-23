require('./buy');

declare const google: {
  payments: {
    inapp: {
      buy: (init: InAppRequestInit<BuyResult>) => void,
      getSkuDetails: (init: InAppRequestInit<SkuDetailsResult>) => void,
      getPurchases: (init: InAppRequestInit<PurchasesResult>) => void,
      consumePurchase: (init: InAppRequestInit<any>) => void,
    }
  }
};

interface InAppRequestInit<R> {
  parameters: { env: "prod" },
  sku?: string
  success?: (result: R) => void,
  failure?: (error: InAppRequestFail) => void,
}

interface BuyResult {
  jwt: string,
  request: {
    cartId: string
  },
  response: {
    orderId: string
  }
}

interface SkuDetailsResult {
  response: {
    details: {
      kind: string,
      inAppProducts: {
        kind: string,
        sku: string,
        item_id: string,
        type: string,
        state: string,
        prices: {
          valueMicros: string,
          currencyCode: string,
          regionCode: string
        }[],
        localeData: {
          title: string,
          description: string,
          languageCode: string
        }[]
      }[]
    }
  }
}

interface PurchasesResult {
  response: {
    details: {
      kind: string,
      itemId: string,
      sku: string,
      createdTime: string,
      state: "ACTIVE" | "CANCELLED_BY_DEVELOPER"
    }[]
  }
}

export interface InAppRequestFail {
  response: {
    errorType: string
  }
}

export function getSkuDetails(): Promise<SkuDetailsResult> {
  return new Promise((resolve, reject) => {
    google.payments.inapp.getSkuDetails({
      parameters: { env: "prod" },
      success: resolve,
      failure: reject
    });
  })
}

export function getPurchases(): Promise<PurchasesResult> {
  return new Promise((resolve, reject) => {
    google.payments.inapp.getPurchases({
      parameters: { env: "prod" },
      success: resolve,
      failure: reject
    });
  })
}

export function buy(productId: string): Promise<BuyResult> {
  return new Promise((resolve, reject) => {
    google.payments.inapp.buy({
      parameters: { env: "prod" },
      sku: productId,
      success: resolve,
      failure: reject
    });
  })
}

export function consumePurchase(productId: string) {
  return new Promise((resolve, reject) => {
    google.payments.inapp.consumePurchase({
      parameters: { env: "prod" },
      sku: productId,
      success: resolve,
      failure: reject
    });
  })
}