import type { MultiSelectOption } from "@/components/SearchableMultiSelect";

/** Predefined marketer specialization categories. Values are stable slugs. */
export const MARKETER_SPECIALTIES: MultiSelectOption[] = [
  { value: "real_estate", label_en: "Real Estate", label_ar: "عقارات" },
  { value: "cars", label_en: "Cars & Vehicles", label_ar: "سيارات ومركبات" },
  { value: "electronics", label_en: "Electronics", label_ar: "إلكترونيات" },
  { value: "mobiles", label_en: "Mobiles & Tablets", label_ar: "موبايلات وتابلت" },
  { value: "furniture", label_en: "Furniture & Home", label_ar: "أثاث ومنزل" },
  { value: "appliances", label_en: "Home Appliances", label_ar: "أجهزة منزلية" },
  { value: "fashion", label_en: "Fashion & Apparel", label_ar: "أزياء وملابس" },
  { value: "beauty", label_en: "Beauty & Cosmetics", label_ar: "تجميل ومستحضرات" },
  { value: "jewelry", label_en: "Jewelry & Watches", label_ar: "مجوهرات وساعات" },
  { value: "food", label_en: "Food & Grocery", label_ar: "طعام وبقالة" },
  { value: "industrial", label_en: "Industrial & Machinery", label_ar: "صناعات ومعدات" },
  { value: "construction", label_en: "Construction Materials", label_ar: "مواد بناء" },
  { value: "medical", label_en: "Medical & Health", label_ar: "طبي وصحي" },
  { value: "agriculture", label_en: "Agriculture", label_ar: "زراعة" },
  { value: "services", label_en: "Business Services", label_ar: "خدمات أعمال" },
  { value: "logistics", label_en: "Logistics & Shipping", label_ar: "لوجستيات وشحن" },
  { value: "education", label_en: "Education & Training", label_ar: "تعليم وتدريب" },
  { value: "tourism", label_en: "Tourism & Travel", label_ar: "سياحة وسفر" },
  { value: "sports", label_en: "Sports & Fitness", label_ar: "رياضة ولياقة" },
  { value: "kids", label_en: "Kids & Baby", label_ar: "أطفال ومستلزماتهم" },
  { value: "pets", label_en: "Pets & Animals", label_ar: "حيوانات أليفة" },
  { value: "b2b_wholesale", label_en: "B2B & Wholesale", label_ar: "جملة وتجارة" },
];

export const MARKETER_LANGUAGES: MultiSelectOption[] = [
  { value: "Arabic", label_en: "Arabic", label_ar: "العربية" },
  { value: "English", label_en: "English", label_ar: "الإنجليزية" },
  { value: "French", label_en: "French", label_ar: "الفرنسية" },
  { value: "German", label_en: "German", label_ar: "الألمانية" },
  { value: "Italian", label_en: "Italian", label_ar: "الإيطالية" },
  { value: "Spanish", label_en: "Spanish", label_ar: "الإسبانية" },
  { value: "Turkish", label_en: "Turkish", label_ar: "التركية" },
  { value: "Russian", label_en: "Russian", label_ar: "الروسية" },
  { value: "Chinese", label_en: "Chinese", label_ar: "الصينية" },
];
