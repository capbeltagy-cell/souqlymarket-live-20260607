export type EgyptLocation = {
  value: string;
  label_en: string;
  label_ar: string;
};

export const EGYPT_GOVERNORATES: EgyptLocation[] = [
  { value: "Cairo", label_en: "Cairo", label_ar: "القاهرة" },
  { value: "Giza", label_en: "Giza", label_ar: "الجيزة" },
  { value: "Alexandria", label_en: "Alexandria", label_ar: "الإسكندرية" },
  { value: "Dakahlia", label_en: "Dakahlia", label_ar: "الدقهلية" },
  { value: "Sharqia", label_en: "Sharqia", label_ar: "الشرقية" },
  { value: "Qalyubia", label_en: "Qalyubia", label_ar: "القليوبية" },
  { value: "Monufia", label_en: "Monufia", label_ar: "المنوفية" },
  { value: "Gharbia", label_en: "Gharbia", label_ar: "الغربية" },
  { value: "Beheira", label_en: "Beheira", label_ar: "البحيرة" },
  { value: "Kafr El Sheikh", label_en: "Kafr El Sheikh", label_ar: "كفر الشيخ" },
  { value: "Damietta", label_en: "Damietta", label_ar: "دمياط" },
  { value: "Port Said", label_en: "Port Said", label_ar: "بورسعيد" },
  { value: "Ismailia", label_en: "Ismailia", label_ar: "الإسماعيلية" },
  { value: "Suez", label_en: "Suez", label_ar: "السويس" },
  { value: "North Sinai", label_en: "North Sinai", label_ar: "شمال سيناء" },
  { value: "South Sinai", label_en: "South Sinai", label_ar: "جنوب سيناء" },
  { value: "Red Sea", label_en: "Red Sea", label_ar: "البحر الأحمر" },
  { value: "Fayoum", label_en: "Fayoum", label_ar: "الفيوم" },
  { value: "Beni Suef", label_en: "Beni Suef", label_ar: "بني سويف" },
  { value: "Minya", label_en: "Minya", label_ar: "المنيا" },
  { value: "Asyut", label_en: "Asyut", label_ar: "أسيوط" },
  { value: "Sohag", label_en: "Sohag", label_ar: "سوهاج" },
  { value: "Qena", label_en: "Qena", label_ar: "قنا" },
  { value: "Luxor", label_en: "Luxor", label_ar: "الأقصر" },
  { value: "Aswan", label_en: "Aswan", label_ar: "أسوان" },
  { value: "New Valley", label_en: "New Valley", label_ar: "الوادي الجديد" },
  { value: "Matrouh", label_en: "Matrouh", label_ar: "مطروح" },
];

export const EGYPT_CITIES_BY_GOVERNORATE: Record<string, EgyptLocation[]> = {
  Cairo: [
    { value: "Cairo", label_en: "Cairo", label_ar: "القاهرة" },
    { value: "Heliopolis", label_en: "Heliopolis", label_ar: "هيليوبوليس" },
    { value: "Maadi", label_en: "Maadi", label_ar: "المعادي" },
    { value: "Nasr City", label_en: "Nasr City", label_ar: "مدينة نصر" },
    { value: "New Cairo", label_en: "New Cairo", label_ar: "القاهرة الجديدة" },
  ],
  Giza: [
    { value: "Giza", label_en: "Giza", label_ar: "الجيزة" },
    { value: "6th of October", label_en: "6th of October", label_ar: "6 أكتوبر" },
    { value: "Sheikh Zayed", label_en: "Sheikh Zayed", label_ar: "الشيخ زايد" },
    { value: "Mohandessin", label_en: "Mohandessin", label_ar: "المهندسين" },
    { value: "Badr", label_en: "Badr", label_ar: "بدر" },
  ],
  Alexandria: [
    { value: "Alexandria", label_en: "Alexandria", label_ar: "الإسكندرية" },
    { value: "Borg El Arab", label_en: "Borg El Arab", label_ar: "برج العرب" },
    { value: "Abu Qir", label_en: "Abu Qir", label_ar: "أبو قير" },
    { value: "Sidi Gaber", label_en: "Sidi Gaber", label_ar: "سيدي جابر" },
    { value: "El Montaza", label_en: "El Montaza", label_ar: "المنتزة" },
  ],
  Dakahlia: [
    { value: "Mansoura", label_en: "Mansoura", label_ar: "المنصورة" },
    { value: "Sherbin", label_en: "Sherbin", label_ar: "شربين" },
    { value: "Talkha", label_en: "Talkha", label_ar: "الطلخا" },
    { value: "Mit Ghamr", label_en: "Mit Ghamr", label_ar: "ميت غمر" },
    { value: "Belqas", label_en: "Belqas", label_ar: "بلقاس" },
  ],
  Sharqia: [
    { value: "Zagazig", label_en: "Zagazig", label_ar: "الزقازيق" },
    { value: "Belbeis", label_en: "Belbeis", label_ar: "بلبيس" },
    { value: "10th of Ramadan", label_en: "10th of Ramadan", label_ar: "10 رمضان" },
    { value: "Abu Hammad", label_en: "Abu Hammad", label_ar: "أبو حماد" },
    { value: "Kafr Saad", label_en: "Kafr Saad", label_ar: "كفر سعد" },
  ],
  Qalyubia: [
    { value: "Shubra El Kheima", label_en: "Shubra El Kheima", label_ar: "شبرا الخيمة" },
    { value: "Banha", label_en: "Banha", label_ar: "بنها" },
    { value: "Qalyub", label_en: "Qalyub", label_ar: "القليوبية" },
    { value: "Tukh", label_en: "Tukh", label_ar: "طوخ" },
    { value: "Khanka", label_en: "Khanka", label_ar: "الخانكة" },
  ],
  Monufia: [
    { value: "Shibin El Kom", label_en: "Shibin El Kom", label_ar: "شبين الكوم" },
    { value: "Menouf", label_en: "Menouf", label_ar: "منوف" },
    { value: "Tala", label_en: "Tala", label_ar: "تلا" },
    { value: "Ashmon", label_en: "Ashmon", label_ar: "أشمون" },
    { value: "Quesna", label_en: "Quesna", label_ar: "قيسنا" },
  ],
  Gharbia: [
    { value: "Tanta", label_en: "Tanta", label_ar: "طنطا" },
    { value: "El Mahalla", label_en: "El Mahalla", label_ar: "المحلة" },
    { value: "Kafr El Zayat", label_en: "Kafr El Zayat", label_ar: "كفر الزيات" },
    { value: "Zifta", label_en: "Zifta", label_ar: "زفتا" },
    { value: "Samanoud", label_en: "Samanoud", label_ar: "سمانود" },
  ],
  Beheira: [
    { value: "Damanhur", label_en: "Damanhur", label_ar: "دمنهور" },
    { value: "Rashid", label_en: "Rashid", label_ar: "رشيد" },
    { value: "Edku", label_en: "Edku", label_ar: "إدكو" },
    { value: "Kafr El Dawar", label_en: "Kafr El Dawar", label_ar: "كفر الدوار" },
    { value: "Abu Hummus", label_en: "Abu Hummus", label_ar: "أبو حمو" },
  ],
  "Kafr El Sheikh": [
    { value: "Kafr El Sheikh", label_en: "Kafr El Sheikh", label_ar: "كفر الشيخ" },
    { value: "Desouq", label_en: "Desouq", label_ar: "دسوق" },
    { value: "Baltim", label_en: "Baltim", label_ar: "بلطيم" },
    { value: "Sidi Salem", label_en: "Sidi Salem", label_ar: "سيدي سالم" },
    { value: "Metoubes", label_en: "Metoubes", label_ar: "مطوبس" },
  ],
  Damietta: [
    { value: "Damietta", label_en: "Damietta", label_ar: "دمياط" },
    { value: "Faraskur", label_en: "Faraskur", label_ar: "فارسكور" },
    { value: "Ras El Bar", label_en: "Ras El Bar", label_ar: "رأس البر" },
    { value: "Kafr Saad", label_en: "Kafr Saad", label_ar: "كفر سعد" },
    { value: "Meet Salsil", label_en: "Meet Salsil", label_ar: "ميت سلسيل" },
  ],
  "Port Said": [
    { value: "Port Said", label_en: "Port Said", label_ar: "بورسعيد" },
    { value: "El Qantara", label_en: "El Qantara", label_ar: "القنطرة" },
    { value: "Ain El Sokhna", label_en: "Ain El Sokhna", label_ar: "عين السخنة" },
  ],
  Ismailia: [
    { value: "Ismailia", label_en: "Ismailia", label_ar: "الإسماعيلية" },
    { value: "Qassasin", label_en: "Qassasin", label_ar: "قصاصين" },
    { value: "Abu Sultan", label_en: "Abu Sultan", label_ar: "أبو سلطان" },
    { value: "Devershat", label_en: "Devershat", label_ar: "دفرسحات" },
  ],
  Suez: [
    { value: "Suez", label_en: "Suez", label_ar: "السويس" },
    { value: "Ain Sokhna", label_en: "Ain Sokhna", label_ar: "عين السخنة" },
  ],
  "North Sinai": [
    { value: "Al Arish", label_en: "Al Arish", label_ar: "العريش" },
    { value: "Sheikh Zuweid", label_en: "Sheikh Zuweid", label_ar: "الشيخ زويد" },
    { value: "Rafah", label_en: "Rafah", label_ar: "رفح" },
    { value: "Bir al-Abed", label_en: "Bir al-Abed", label_ar: "بئر العبد" },
  ],
  "South Sinai": [
    { value: "Sharm El Sheikh", label_en: "Sharm El Sheikh", label_ar: "شرم الشيخ" },
    { value: "Dahab", label_en: "Dahab", label_ar: "دهب" },
    { value: "Nuweiba", label_en: "Nuweiba", label_ar: "نويبع" },
    { value: "Saint Catherine", label_en: "Saint Catherine", label_ar: "سانت كاترين" },
    { value: "Taba", label_en: "Taba", label_ar: "طابا" },
  ],
  "Red Sea": [
    { value: "Hurghada", label_en: "Hurghada", label_ar: "الغردقة" },
    { value: "Safaga", label_en: "Safaga", label_ar: "سفاجا" },
    { value: "Quseir", label_en: "Quseir", label_ar: "القصير" },
    { value: "Marsa Alam", label_en: "Marsa Alam", label_ar: "مرسى علم" },
    { value: "Ras Gharib", label_en: "Ras Gharib", label_ar: "رأس غارب" },
  ],
  Fayoum: [
    { value: "Fayoum", label_en: "Fayoum", label_ar: "الفيوم" },
    { value: "Tunis", label_en: "Tunis", label_ar: "طامية" },
    { value: "Ibshway", label_en: "Ibshway", label_ar: "إبشواي" },
    { value: "Senour", label_en: "Senour", label_ar: "سنورس" },
  ],
  "Beni Suef": [
    { value: "Beni Suef", label_en: "Beni Suef", label_ar: "بني سويف" },
    { value: "El Fashn", label_en: "El Fashn", label_ar: "الفشن" },
    { value: "Samalut", label_en: "Samalut", label_ar: "سمالوط" },
    { value: "Biba", label_en: "Biba", label_ar: "ببا" },
  ],
  Minya: [
    { value: "Minya", label_en: "Minya", label_ar: "المنيا" },
    { value: "Beni Mazar", label_en: "Beni Mazar", label_ar: "بني مزار" },
    { value: "Mallawi", label_en: "Mallawi", label_ar: "ملوي" },
    { value: "Abu Qirqas", label_en: "Abu Qirqas", label_ar: "أبو قرقاص" },
  ],
  Asyut: [
    { value: "Asyut", label_en: "Asyut", label_ar: "أسيوط" },
    { value: "Dairut", label_en: "Dairut", label_ar: "ديروط" },
    { value: "Manfalut", label_en: "Manfalut", label_ar: "منفلوط" },
    { value: "Sahel Selim", label_en: "Sahel Selim", label_ar: "ساحل سليم" },
  ],
  Sohag: [
    { value: "Sohag", label_en: "Sohag", label_ar: "سوهاج" },
    { value: "Akhmim", label_en: "Akhmim", label_ar: "أخميم" },
    { value: "Tahta", label_en: "Tahta", label_ar: "طهطا" },
    { value: "Dar El Salam", label_en: "Dar El Salam", label_ar: "دار السلام" },
  ],
  Qena: [
    { value: "Qena", label_en: "Qena", label_ar: "قنا" },
    { value: "Qus", label_en: "Qus", label_ar: "قوص" },
    { value: "Farshut", label_en: "Farshut", label_ar: "فرشوط" },
    { value: "Nag Hammadi", label_en: "Nag Hammadi", label_ar: "نقادة" },
  ],
  Luxor: [
    { value: "Luxor", label_en: "Luxor", label_ar: "الأقصر" },
    { value: "Esna", label_en: "Esna", label_ar: "إسنا" },
    { value: "Edfu", label_en: "Edfu", label_ar: "إدفو" },
    { value: "Armant", label_en: "Armant", label_ar: "أرمنت" },
  ],
  Aswan: [
    { value: "Aswan", label_en: "Aswan", label_ar: "أسوان" },
    { value: "Kom Ombo", label_en: "Kom Ombo", label_ar: "كوم أمبو" },
    { value: "Daraw", label_en: "Daraw", label_ar: "دراو" },
    { value: "Abu Simbel", label_en: "Abu Simbel", label_ar: "أبو سمبل" },
  ],
  "New Valley": [
    { value: "Kharga", label_en: "Kharga", label_ar: "الخارجة" },
    { value: "Dakhla", label_en: "Dakhla", label_ar: "الداخلة" },
    { value: "Farafra", label_en: "Farafra", label_ar: "الفرافرة" },
    { value: "Bawiti", label_en: "Bawiti", label_ar: "بويطي" },
  ],
  Matrouh: [
    { value: "Marsa Matrouh", label_en: "Marsa Matrouh", label_ar: "مرسى مطروح" },
    { value: "Siwa", label_en: "Siwa", label_ar: "سيوة" },
    { value: "Dabaa", label_en: "Dabaa", label_ar: "الضبعة" },
    { value: "Alamein", label_en: "Alamein", label_ar: "العلامين" },
  ],
};

const normalize = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
};

export function findGovernorateOption(value: string | null | undefined): EgyptLocation | undefined {
  const normalized = normalize(value);
  if (!normalized) return undefined;
  return EGYPT_GOVERNORATES.find((gov) =>
    [gov.value, gov.label_en, gov.label_ar].some((label) => label.toLowerCase() === normalized.toLowerCase()),
  );
}

export function findCityOption(value: string | null | undefined): EgyptLocation | undefined {
  const normalized = normalize(value);
  if (!normalized) return undefined;
  for (const cities of Object.values(EGYPT_CITIES_BY_GOVERNORATE)) {
    const found = cities.find((city) =>
      [city.value, city.label_en, city.label_ar].some((label) => label.toLowerCase() === normalized.toLowerCase()),
    );
    if (found) return found;
  }
  return undefined;
}

export function normalizeEgyptGovernorate(value: string | null | undefined): string | null {
  const found = findGovernorateOption(value);
  return found ? found.value : normalize(value);
}

export function normalizeEgyptCity(value: string | null | undefined): string | null {
  const found = findCityOption(value);
  return found ? found.value : normalize(value);
}

export function translateEgyptGovernorate(value: string | null | undefined, locale: "en" | "ar" = "en"): string | null {
  const found = findGovernorateOption(value);
  if (!found) return normalize(value);
  return locale === "ar" ? found.label_ar : found.label_en;
}

export function translateEgyptCity(value: string | null | undefined, locale: "en" | "ar" = "en"): string | null {
  const found = findCityOption(value);
  if (!found) return normalize(value);
  return locale === "ar" ? found.label_ar : found.label_en;
}

export function getCitiesForGovernorate(governorate: string | null | undefined): EgyptLocation[] {
  const normalized = normalizeEgyptGovernorate(governorate);
  if (!normalized) return [];
  return EGYPT_CITIES_BY_GOVERNORATE[normalized] ?? [];
}

export function getGovernorateVariants(governorate: string | null | undefined): string[] {
  const found = findGovernorateOption(governorate);
  if (!found) return governorate ? [governorate.trim()] : [];
  return Array.from(new Set([found.value, found.label_ar]));
}

export function getCityVariants(city: string | null | undefined): string[] {
  const found = findCityOption(city);
  if (!found) return city ? [city.trim()] : [];
  return Array.from(new Set([found.value, found.label_ar]));
}
