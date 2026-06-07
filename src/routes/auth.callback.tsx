import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in… — Souqly" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errDesc = url.searchParams.get("error_description") ?? url.hash.match(/error_description=([^&]+)/)?.[1];

        if (errDesc) throw new Error(decodeURIComponent(errDesc));

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Hash-based (implicit) flow: detectSessionInUrl in the client handles it.
          // Give it a tick to settle, then verify.
          await new Promise((r) => setTimeout(r, 100));
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("No session returned from provider");
        }

        navigate({ to: "/dashboard", replace: true });
      } catch (e) {
        toast.error((e as Error).message);
        navigate({ to: "/auth", replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Signing you in…</span>
      </div>
    </div>
  );
}
