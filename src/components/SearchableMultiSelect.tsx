import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export type MultiSelectOption = {
  value: string;
  label_en: string;
  label_ar: string;
};

type Props = {
  value: string[];
  options: MultiSelectOption[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  max?: number;
};

/** Searchable multi-select with chips. Values map to option.value. */
export function SearchableMultiSelect({
  value,
  options,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  max,
}: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ph = placeholder ?? (locale === "ar" ? "اختر..." : "Select...");
  const sph = searchPlaceholder ?? (locale === "ar" ? "ابحث..." : "Search...");
  const empty = emptyText ?? (locale === "ar" ? "لا توجد نتائج" : "No results");

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (!max || value.length < max) onChange([...value, v]);
  };

  const labelFor = (v: string) => {
    const o = options.find((x) => x.value === v);
    if (!o) return v;
    return locale === "ar" ? o.label_ar : o.label_en;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn(
              "h-10 w-full justify-between font-normal",
              value.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              {value.length === 0
                ? ph
                : locale === "ar"
                  ? `${value.length} محدد`
                  : `${value.length} selected`}
            </span>
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
            <CommandInput placeholder={sph} />
            <CommandList>
              <CommandEmpty>{empty}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const active = value.includes(o.value);
                  return (
                    <CommandItem key={o.value} value={o.value} onSelect={() => toggle(o.value)}>
                      <Check className={cn("me-2 h-4 w-4", active ? "opacity-100" : "opacity-0")} />
                      {locale === "ar" ? o.label_ar : o.label_en}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 pe-1">
              {labelFor(v)}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
