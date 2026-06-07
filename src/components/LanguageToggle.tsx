import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="gap-2 text-foreground"
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">{locale === "ar" ? "EN" : "ع"}</span>
    </Button>
  );
}
