import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nProvider";
import {
  EGYPT_GOVERNORATES,
  getCitiesForGovernorate,
  type EgyptLocation,
} from "@/lib/egypt.locations";

type Props = {
  governorate: string;
  city: string;
  onChange: (next: { governorate: string; city: string }) => void;
  required?: boolean;
  labels?: { governorate?: string; city?: string };
};

/** Smart Egyptian location selector with searchable combobox UI. */
export function LocationPicker({ governorate, city, onChange, required, labels }: Props) {
  const { locale } = useI18n();
  const govLabel = labels?.governorate ?? (locale === "ar" ? "المحافظة" : "Governorate");
  const cityLabel = labels?.city ?? (locale === "ar" ? "المدينة" : "City");
  const cities = getCitiesForGovernorate(governorate);

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label>
          {govLabel}
          {required && " *"}
        </Label>
        <SearchableSelect
          value={governorate}
          options={EGYPT_GOVERNORATES}
          placeholder={locale === "ar" ? "اختر المحافظة" : "Select governorate"}
          searchPlaceholder={locale === "ar" ? "ابحث..." : "Search..."}
          emptyText={locale === "ar" ? "لا توجد نتائج" : "No results"}
          onChange={(v) => onChange({ governorate: v, city: "" })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          {cityLabel}
          {required && " *"}
        </Label>
        <SearchableSelect
          value={city}
          options={cities}
          disabled={!governorate}
          placeholder={
            !governorate
              ? locale === "ar"
                ? "اختر المحافظة أولاً"
                : "Select governorate first"
              : locale === "ar"
                ? "اختر المدينة"
                : "Select city"
          }
          searchPlaceholder={locale === "ar" ? "ابحث..." : "Search..."}
          emptyText={locale === "ar" ? "لا توجد نتائج" : "No results"}
          onChange={(v) => onChange({ governorate, city: v })}
        />
      </div>
    </div>
  );
}

function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
}: {
  value: string;
  options: EgyptLocation[];
  onChange: (v: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
}) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const displayLabel = selected ? (locale === "ar" ? selected.label_ar : selected.label_en) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between font-normal",
            !displayLabel && "text-muted-foreground",
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(val, search) => {
            // cmdk lowercases `val`; match options case-insensitively.
            const opt = options.find((o) => o.value.toLowerCase() === val);
            if (!opt) return 0;
            const hay = `${opt.label_en} ${opt.label_ar}`.toLowerCase();
            return hay.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("me-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")}
                  />
                  {locale === "ar" ? o.label_ar : o.label_en}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
