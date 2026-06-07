import type { Locale } from "@/i18n/dict";
import { supabase } from "@/integrations/supabase/client";

export const LISTING_TYPES = ["product", "service", "real_estate", "land", "factory", "opportunity"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export function publicMediaUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function pick<T>(locale: Locale, ar: T, en: T): T {
  return locale === "ar" ? ar : en;
}

export function initialOf(name: string | null | undefined): string {
  if (!name) return "?";
  return name.trim()[0]?.toUpperCase() ?? "?";
}
