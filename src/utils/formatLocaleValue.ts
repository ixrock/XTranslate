// Format locale numbers and other values

export function formatNumber({ value, locale = "en-US" }: { value: number, locale?: string }) {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPrice({ value, locale, currency = "USD" }: { value: number, locale?: string, currency?: string }) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(value);
}
