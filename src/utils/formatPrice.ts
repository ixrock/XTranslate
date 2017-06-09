// Format price value with specific currency and locale

export function formatPrice(amount: number, currencyCode = "USD", locale = navigator.language) {
  var digits = amount.toString().split(".")[1] || "";
  return amount.toLocaleString(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: digits.length,
    maximumFractionDigits: digits.length,
  });
}
