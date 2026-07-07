// Ready-made Arabic post text for shareable items. Uses ONLY real DB values.
import { formatPrice } from "@/lib/currency";
import { translateEgyptCity, translateEgyptGovernorate } from "@/lib/egypt.locations";
import type { Locale } from "@/i18n/dict";

function loc(locale: Locale, gov?: string | null, city?: string | null) {
  const g = gov ? translateEgyptGovernorate(gov, locale) : null;
  const c = city ? translateEgyptCity(city, locale) : null;
  return [g, c].filter(Boolean).join(" - ");
}

export function listingCaption(input: {
  locale: Locale;
  type?: string | null;
  titleAr?: string | null;
  titleEn?: string | null;
  price?: number | null;
  currency?: string | null;
  governorate?: string | null;
  city?: string | null;
  sourceName?: string | null;
}) {
  const { locale } = input;
  const ar = locale === "ar";
  const title = (ar ? input.titleAr : input.titleEn) ?? input.titleAr ?? input.titleEn ?? "";
  const price = input.price != null ? formatPrice(input.price, locale, { currency: input.currency ?? "EGP" }) : null;
  const where = loc(locale, input.governorate, input.city);

  const isRealEstateLike = input.type === "real_estate" || input.type === "land";
  const header = isRealEstateLike
    ? (ar ? "🏡 إعلان عقاري على سوقلي" : "🏡 Real-estate listing on Souqly")
    : (ar ? "🔥 فرصة مميزة على سوقلي" : "🔥 Great opportunity on Souqly");

  const lines = [header, title];
  if (price) lines.push(ar ? `السعر: ${price}` : `Price: ${price}`);
  if (where) lines.push(ar ? `المكان: ${where}` : `Location: ${where}`);
  lines.push(ar ? "اطلب من هنا عبر سوقلي 👇" : "Order via Souqly 👇");
  if (input.sourceName) lines.push(ar ? `المصدر: ${input.sourceName}` : `Source: ${input.sourceName}`);
  return lines.filter(Boolean).join("\n");
}

export function companyCaption(input: {
  locale: Locale;
  nameAr?: string | null;
  nameEn?: string | null;
  industry?: string | null;
  governorate?: string | null;
  city?: string | null;
}) {
  const ar = input.locale === "ar";
  const name = (ar ? input.nameAr : input.nameEn) ?? input.nameAr ?? input.nameEn ?? "";
  const where = loc(input.locale, input.governorate, input.city);
  const lines = [
    ar ? "🏢 شركة موثوقة على سوقلي" : "🏢 Trusted company on Souqly",
    name,
  ];
  if (input.industry) lines.push(ar ? `النشاط: ${input.industry}` : `Industry: ${input.industry}`);
  if (where) lines.push(ar ? `المكان: ${where}` : `Location: ${where}`);
  lines.push(ar ? "تواصل عبر سوقلي 👇" : "Contact via Souqly 👇");
  return lines.join("\n");
}

export function referralCaption(input: {
  locale: Locale;
  titleAr?: string | null;
  titleEn?: string | null;
  commissionPct?: number | null;
}) {
  const ar = input.locale === "ar";
  const title = (ar ? input.titleAr : input.titleEn) ?? input.titleAr ?? input.titleEn ?? "";
  return [
    ar ? "🔥 فرصة مميزة على سوقلي" : "🔥 Great opportunity on Souqly",
    title,
    ar ? "اطلب من خلال الرابط التالي 👇" : "Order via this link 👇",
  ].join("\n");
}
