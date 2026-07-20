import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const RETURN_TO_KEY = "souqly:return_to";

function consumeReturnTo() {
  try {
    const value = localStorage.getItem(RETURN_TO_KEY);
    localStorage.removeItem(RETURN_TO_KEY);
    return value?.startsWith("/") && !value.startsWith("//") ? value : null;
  } catch {
    return null;
  }
}

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
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const errDesc =
          url.searchParams.get("error_description") ??
          url.hash.match(/error_description=([^&]+)/)?.[1];

        if (errDesc) throw new Error(decodeURIComponent(errDesc));

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as "signup" | "recovery" | "invite" | "email_change" | "email",
          });
          if (error) throw error;
        } else {
          // Hash-based (implicit) flow: detectSessionInUrl in the client handles it.
          await new Promise((r) => setTimeout(r, 150));
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("No session returned from provider");
        }

        if (type === "recovery") {
          navigate({ to: "/reset-password", replace: true });
        } else {
          const returnTo = consumeReturnTo();
          if (returnTo) window.location.replace(returnTo);
          else navigate({ to: "/dashboard", replace: true });
        }
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
