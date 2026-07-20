export type ShippingQuote = {
  amount: number;
  etaMinDays: number;
  etaMaxDays: number;
};

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/[إأآ]/g, "ا").replace(/ة/g, "ه");

const ZONES: Array<{ names: string[]; quote: ShippingQuote }> = [
  {
    names: ["القاهره", "cairo", "الجيزه", "giza"],
    quote: { amount: 70, etaMinDays: 1, etaMaxDays: 2 },
  },
  {
    names: ["الاسكندريه", "alexandria", "البحيره", "beheira"],
    quote: { amount: 85, etaMinDays: 2, etaMaxDays: 3 },
  },
  {
    names: [
      "القليوبيه",
      "المنوفيه",
      "الغربيه",
      "الدقهليه",
      "الشرقيه",
      "كفر الشيخ",
      "دمياط",
      "بورسعيد",
      "الاسماعيليه",
      "السويس",
      "qalyubia",
      "monufia",
      "gharbia",
      "dakahlia",
      "sharqia",
      "kafr el sheikh",
      "damietta",
      "port said",
      "ismailia",
      "suez",
    ],
    quote: { amount: 95, etaMinDays: 2, etaMaxDays: 4 },
  },
  {
    names: [
      "الفيوم",
      "بني سويف",
      "المنيا",
      "اسيوط",
      "سوهاج",
      "قنا",
      "الاقصر",
      "اسوان",
      "fayoum",
      "beni suef",
      "minya",
      "assiut",
      "sohag",
      "qena",
      "luxor",
      "aswan",
    ],
    quote: { amount: 120, etaMinDays: 3, etaMaxDays: 5 },
  },
];

export function getShippingQuote(governorate: string): ShippingQuote {
  const key = normalize(governorate);
  return (
    ZONES.find((zone) => zone.names.some((name) => normalize(name) === key))?.quote ?? {
      amount: 140,
      etaMinDays: 3,
      etaMaxDays: 6,
    }
  );
}
