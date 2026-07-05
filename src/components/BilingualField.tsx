import { useState, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  label: string;
  primary: ReactNode;
  secondary: ReactNode;
  /** True when the secondary field already has content — keep it open. */
  hasSecondary?: boolean;
  required?: boolean;
};

/**
 * Bilingual field wrapper. Only the primary-language input is visible; the
 * secondary-language input is tucked behind a small translation icon so the
 * form reads as a single-language experience. Existing translations auto-open
 * so nothing is ever hidden from the user.
 */
export function BilingualField({ label, primary, secondary, hasSecondary, required }: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(!!hasSecondary);
  const other = locale === "ar" ? "English" : "العربية";
  const tip = open
    ? (locale === "ar" ? `إخفاء ${other}` : `Hide ${other}`)
    : (locale === "ar" ? `إضافة ${other}` : `Add ${other}`);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}{required && " *"}</Label>
        <CollapsibleTrigger
          type="button"
          title={tip}
          aria-label={tip}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:text-primary hover:bg-muted transition ${open ? "text-primary bg-muted border-border" : ""}`}
        >
          <Languages className="h-3.5 w-3.5" />
        </CollapsibleTrigger>
      </div>
      {primary}
      <CollapsibleContent className="pt-2">{secondary}</CollapsibleContent>
    </Collapsible>
  );
}
