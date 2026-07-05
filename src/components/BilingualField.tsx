import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type Props = {
  label: string;
  primary: ReactNode;
  /** Secondary-language field kept for API compatibility; not rendered to normal users. */
  secondary?: ReactNode;
  hasSecondary?: boolean;
  required?: boolean;
};

/**
 * Single-language field wrapper.
 * Renders only the primary-language input; the secondary (English) translation
 * control is intentionally hidden per product rules — normal users see Arabic
 * only. Multilingual data support remains in the form state so admins/backend
 * can still populate translations elsewhere.
 */
export function BilingualField({ label, primary, required }: Props) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && " *"}</Label>
      {primary}
    </div>
  );
}
