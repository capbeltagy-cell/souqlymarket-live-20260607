import type { Locale } from "@/i18n/dict";

export type ListingType = "product" | "service" | "real_estate" | "land" | "factory" | "opportunity";

export interface SampleListing {
  id: string;
  type: ListingType;
  title_ar: string;
  title_en: string;
  company_ar: string;
  company_en: string;
  price: number;
  currency: string;
  commission: number;
  country_ar: string;
  country_en: string;
  image: string;
  featured?: boolean;
}

export interface SampleCompany {
  id: string;
  name_ar: string;
  name_en: string;
  industry_ar: string;
  industry_en: string;
  country_ar: string;
  country_en: string;
  listings: number;
  verified: boolean;
  initial: string;
}

export interface SampleAgent {
  id: string;
  name_ar: string;
  name_en: string;
  headline_ar: string;
  headline_en: string;
  country_ar: string;
  country_en: string;
  deals: number;
  initial: string;
}

const img = (seed: string, w = 800, h = 600) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

export const sampleListings: SampleListing[] = [
  { id: "l1", type: "product", title_ar: "آلة تعبئة وتغليف صناعية", title_en: "Industrial Packaging Machine",
    company_ar: "مصانع الرياض المتقدمة", company_en: "Riyadh Advanced Industries",
    price: 45000, currency: "USD", commission: 8, country_ar: "السعودية", country_en: "Saudi Arabia",
    image: img("photo-1565793298595-6a879b1d9492"), featured: true },
  { id: "l2", type: "service", title_ar: "استشارات تسويق رقمي للشركات", title_en: "B2B Digital Marketing Consulting",
    company_ar: "أوركا للحلول الرقمية", company_en: "Orca Digital Solutions",
    price: 2500, currency: "USD", commission: 15, country_ar: "الإمارات", country_en: "UAE",
    image: img("photo-1551434678-e076c223a692"), featured: true },
  { id: "l3", type: "real_estate", title_ar: "مجمع تجاري في وسط الرياض", title_en: "Commercial Complex in Riyadh CBD",
    company_ar: "النور العقارية", company_en: "Al Noor Real Estate",
    price: 12500000, currency: "USD", commission: 2.5, country_ar: "السعودية", country_en: "Saudi Arabia",
    image: img("photo-1486406146926-c627a92ad1ab"), featured: true },
  { id: "l4", type: "land", title_ar: "أرض صناعية 50,000م² شمال جدة", title_en: "50,000m² industrial land north of Jeddah",
    company_ar: "تطوير الأراضي القابضة", company_en: "Land Development Holding",
    price: 3200000, currency: "USD", commission: 3, country_ar: "السعودية", country_en: "Saudi Arabia",
    image: img("photo-1500382017468-9049fed747ef") },
  { id: "l5", type: "factory", title_ar: "مصنع منسوجات جاهز للتشغيل", title_en: "Turnkey textile factory",
    company_ar: "النيل للنسيج", company_en: "Nile Textiles",
    price: 1800000, currency: "USD", commission: 5, country_ar: "مصر", country_en: "Egypt",
    image: img("photo-1581094794329-c8112a89af12") },
  { id: "l6", type: "opportunity", title_ar: "فرصة استثمار في مزرعة طاقة شمسية", title_en: "Solar farm investment opportunity",
    company_ar: "بريسما للطاقة", company_en: "Prisma Energy",
    price: 750000, currency: "USD", commission: 6, country_ar: "الأردن", country_en: "Jordan",
    image: img("photo-1509391366360-2e959784a276") },
  { id: "l7", type: "product", title_ar: "خط إنتاج عبوات بلاستيكية", title_en: "Plastic bottle production line",
    company_ar: "بولي جلف", company_en: "Poly Gulf",
    price: 280000, currency: "USD", commission: 7, country_ar: "الإمارات", country_en: "UAE",
    image: img("photo-1504917595217-d4dc5ebe6122") },
  { id: "l8", type: "service", title_ar: "خدمات شحن وتخليص جمركي", title_en: "Freight forwarding & customs clearance",
    company_ar: "لوجستيك إكسبرس", company_en: "Logistic Express",
    price: 0, currency: "USD", commission: 10, country_ar: "السعودية", country_en: "Saudi Arabia",
    image: img("photo-1601584115197-04ecc0da31d7") },
];

export const sampleCompanies: SampleCompany[] = [
  { id: "c1", name_ar: "مصانع الرياض المتقدمة", name_en: "Riyadh Advanced Industries", industry_ar: "تصنيع", industry_en: "Manufacturing", country_ar: "السعودية", country_en: "Saudi Arabia", listings: 24, verified: true, initial: "R" },
  { id: "c2", name_ar: "أوركا للحلول الرقمية", name_en: "Orca Digital Solutions", industry_ar: "تقنية", industry_en: "Technology", country_ar: "الإمارات", country_en: "UAE", listings: 12, verified: true, initial: "O" },
  { id: "c3", name_ar: "النور العقارية", name_en: "Al Noor Real Estate", industry_ar: "عقارات", industry_en: "Real Estate", country_ar: "السعودية", country_en: "Saudi Arabia", listings: 47, verified: true, initial: "N" },
  { id: "c4", name_ar: "النيل للنسيج", name_en: "Nile Textiles", industry_ar: "نسيج", industry_en: "Textiles", country_ar: "مصر", country_en: "Egypt", listings: 8, verified: false, initial: "N" },
  { id: "c5", name_ar: "بريسما للطاقة", name_en: "Prisma Energy", industry_ar: "طاقة", industry_en: "Energy", country_ar: "الأردن", country_en: "Jordan", listings: 6, verified: true, initial: "P" },
  { id: "c6", name_ar: "بولي جلف", name_en: "Poly Gulf", industry_ar: "تصنيع", industry_en: "Manufacturing", country_ar: "الإمارات", country_en: "UAE", listings: 19, verified: true, initial: "P" },
];

export const sampleAgents: SampleAgent[] = [
  { id: "a1", name_ar: "خالد المنصور", name_en: "Khaled Al-Mansour", headline_ar: "خبير مبيعات B2B • 12 سنة خبرة", headline_en: "B2B sales specialist • 12y experience", country_ar: "السعودية", country_en: "Saudi Arabia", deals: 87, initial: "K" },
  { id: "a2", name_ar: "ليلى عبد الرحمن", name_en: "Layla Abdulrahman", headline_ar: "متخصصة عقارات تجارية", headline_en: "Commercial real estate specialist", country_ar: "الإمارات", country_en: "UAE", deals: 64, initial: "L" },
  { id: "a3", name_ar: "أحمد فاروق", name_en: "Ahmed Farouk", headline_ar: "تسويق صناعي ومعدات ثقيلة", headline_en: "Industrial & heavy equipment marketing", country_ar: "مصر", country_en: "Egypt", deals: 41, initial: "A" },
  { id: "a4", name_ar: "ريم الحسن", name_en: "Reem Al-Hassan", headline_ar: "خدمات لوجستية وشحن", headline_en: "Logistics & freight services", country_ar: "الأردن", country_en: "Jordan", deals: 33, initial: "R" },
];

export function listingTitle(l: SampleListing, locale: Locale) {
  return locale === "ar" ? l.title_ar : l.title_en;
}
export function listingCompany(l: SampleListing, locale: Locale) {
  return locale === "ar" ? l.company_ar : l.company_en;
}
export function listingCountry(l: SampleListing, locale: Locale) {
  return locale === "ar" ? l.country_ar : l.country_en;
}
