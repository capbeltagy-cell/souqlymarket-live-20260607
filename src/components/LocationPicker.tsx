import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/I18nProvider";
import { EGYPT_GOVERNORATES, getCitiesForGovernorate } from "@/lib/egypt.locations";

type Props = {
  governorate: string;
  city: string;
  onChange: (next: { governorate: string; city: string }) => void;
  required?: boolean;
  labels?: { governorate?: string; city?: string };
};

/**
 * Smart Egyptian location selector.
 * Governorate → dependent City. Country is fixed to Egypt (architecture is
 * ready for additional countries by extending egypt.locations later).
 */
export function LocationPicker({ governorate, city, onChange, required, labels }: Props) {
  const { locale, t } = useI18n();
  const govLabel = labels?.governorate ?? t("field_governorate" as never) ?? (locale === "ar" ? "المحافظة" : "Governorate");
  const cityLabel = labels?.city ?? t("field_city" as never) ?? (locale === "ar" ? "المدينة" : "City");

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>{govLabel}{required && " *"}</Label>
        <select
          required={required}
          value={governorate}
          onChange={(e) => onChange({ governorate: e.target.value, city: "" })}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{locale === "ar" ? "اختر المحافظة" : "Select governorate"}</option>
          {EGYPT_GOVERNORATES.map((g) => (
            <option key={g.value} value={g.value}>{locale === "ar" ? g.label_ar : g.label_en}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>{cityLabel}{required && " *"}</Label>
        <select
          required={required}
          disabled={!governorate}
          value={city}
          onChange={(e) => onChange({ governorate, city: e.target.value })}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
        >
          <option value="">{locale === "ar" ? "اختر المدينة" : "Select city"}</option>
          {getCitiesForGovernorate(governorate).map((c) => (
            <option key={c.value} value={c.value}>{locale === "ar" ? c.label_ar : c.label_en}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
