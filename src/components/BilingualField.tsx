import { useState, type ReactNode } from "react";
import { ChevronDown, Languages } from "lucide-react";
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
 * Bilingual field wrapper. Shows only the primary-language input; hides the
 * secondary-language input behind an "Add English/Arabic translation" toggle
 * so long forms feel like a single-language experience by default. Existing
 * translations auto-expand so nothing is ever hidden from the user.
 */
export function BilingualField({ label, primary, secondary, hasSecondary, required }: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(!!hasSecondary);
  const other = locale === "ar" ? "English" : "العربية";
  const toggleText = open
    ? (locale === "ar" ? `إخفاء ترجمة ${other}` : `Hide ${other} translation`)
    : (locale === "ar" ? `إضافة ترجمة ${other}` : `Add ${other} translation`);

  return (
    <div className="space-y-1.5">
      <Label>{label}{required && " *"}</Label>
      {primary}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition mt-1">
          <Languages className="h-3.5 w-3.5" />
          <span>{toggleText}</span>
          <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">{secondary}</CollapsibleContent>
      </Collapsible>
    </div>
  );
}
