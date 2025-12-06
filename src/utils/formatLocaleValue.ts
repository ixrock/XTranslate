// Format locale numbers and other values

export function formatNumber({ value, locale = "en-US" }: { value: number, locale?: string }) {
  try {
    locale = locale.replace("_", "-");
    return new Intl.NumberFormat(locale).format(value);
  } catch (err) {
    console.error(`Intl.NumberFormat failed for locale ${locale}:`, { err, value });
    return value;
  }
}

export function formatPrice({ value, locale, currency = "USD" }: { value: number, locale?: string, currency?: string }) {
  try {
    locale = locale.replace("_", "-");
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(value);
  } catch (err) {
    console.error(`Intl.NumberFormat failed for locale ${locale}:`, { err, value });
    return `${value}${currency}`;
  }
}
