import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated/choose-role")({
  head: () => ({
    meta: [{ title: "حساب سوقلي" }, { name: "robots", content: "noindex,follow" }],
  }),
  component: ChooseRoleRedirect,
});

/**
 * Souqly now has one account type. Keep the legacy URL as a safe redirect so
 * old bookmarks and post-auth callbacks do not break.
 */
function ChooseRoleRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem("souqly:role_choice", "customer");
    } catch {
      // Local storage is optional.
    }
    void navigate({ to: "/business-solutions", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface-2">
      <SiteHeader />
      <main className="container-souqly grid min-h-[60vh] place-items-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          جاري تجهيز حسابك…
        </div>
      </main>
    </div>
  );
}
