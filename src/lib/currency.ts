// Egypt-first currency formatting helper.
// All monetary values across Souqly are denominated in Egyptian Pound (EGP).
// Arabic UI shows "جنيه"; English UI shows "EGP".

export type Locale = "ar" | "en";

export function currencyLabel(locale: Locale | string): string {
  return locale === "ar" ? "جنيه" : "EGP";
}

export function formatPrice(
  amount: number | null | undefined,
  locale: Locale | string = "ar",
  opts: { showZero?: boolean } = {},
): string {
  if (amount == null || (!opts.showZero && amount === 0)) return "—";
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  const formatted = n.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
  return locale === "ar" ? `${formatted} جنيه` : `EGP ${formatted}`;
}
