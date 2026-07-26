import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({ meta: [{ title: "إدارة العملاء — سوقلي" }] }),
  component: LegacyLeadsRedirect,
});

/**
 * Keeps old bookmarks and dashboard links working while avoiding a second,
 * diverging CRM interface. The maintained CRM now lives in Business Suite.
 */
function LegacyLeadsRedirect() {
  useEffect(() => {
    window.location.replace("/business-suite?tab=crm");
  }, []);

  return (
    <main className="grid min-h-[60vh] place-items-center bg-surface-2" dir="rtl">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        جارٍ فتح إدارة العملاء…
      </div>
    </main>
  );
}
