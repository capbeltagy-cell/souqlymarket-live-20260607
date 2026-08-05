import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { acceptCompanyInvitation } from "@/lib/company-workspace.functions";

export const Route = createFileRoute("/_authenticated/company-invitations/$token")({
  head: () => ({ meta: [{ title: "الانضمام إلى الشركة — سوقلي" }] }),
  component: AcceptCompanyInvitationPage,
});

function AcceptCompanyInvitationPage() {
  const { token } = Route.useParams();
  const accept = useServerFn(acceptCompanyInvitation);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await accept({ data: { token } });
      setAccepted(true);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <SiteHeader />
      <main className="container-souqly grid flex-1 place-items-center py-12">
        <div className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-card">
          {accepted ? (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <h1 className="mt-4 text-2xl font-bold">تم انضمامك إلى الشركة</h1>
              <p className="mt-2 text-muted-foreground">
                أصبحت مساحة العمل متاحة وفق الصلاحية التي منحها لك مالك الشركة.
              </p>
              <Button asChild className="mt-6">
                <Link to="/company-workspace">فتح مساحة العمل</Link>
              </Button>
            </>
          ) : (
            <>
              <Building2 className="mx-auto h-12 w-12 text-primary" />
              <h1 className="mt-4 text-2xl font-bold">دعوة للانضمام إلى شركة</h1>
              <p className="mt-2 text-muted-foreground">
                سيتم التحقق أن بريد حسابك الحالي يطابق البريد المرسل إليه الدعوة.
              </p>
              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <Button className="mt-6" disabled={busy} onClick={() => void submit()}>
                {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}قبول الدعوة
              </Button>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
