import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, type Locale, type DictKey } from "./dict";

interface I18nCtx {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: (key: DictKey) => string;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<I18nCtx | null>(null);

const STORAGE_KEY = "souqly.locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Locale | null) : null;
    if (saved === "ar" || saved === "en") setLocaleState(saved);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  };

  const value = useMemo<I18nCtx>(
    () => ({
      locale,
      dir,
      setLocale,
      t: (key) => dict[locale][key] ?? dict.en[key] ?? key,
    }),
    [locale, dir],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
