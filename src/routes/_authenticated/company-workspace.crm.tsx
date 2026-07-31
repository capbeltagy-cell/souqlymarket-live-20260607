import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ContactRound, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCompanyCrm, updateCompanyCrmLead } from "@/lib/company-erp.functions";

export const Route = createFileRoute("/_authenticated/company-workspace/crm")({
  head: () => ({ meta: [{ title: "إدارة العملاء CRM — سوقلي" }] }),
  component: CompanyCrmPage,
});
type Payload = Awaited<ReturnType<typeof getCompanyCrm>>;
const labels: Record<string, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  negotiating: "قيد التفاوض",
  won: "مكتمل",
  lost: "غير مكتمل",
};

function CompanyCrmPage() {
  const fetchCrm = useServerFn(getCompanyCrm);
  const saveLead = useServerFn(updateCompanyCrmLead);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(
    () =>
      fetchCrm()
        .then(setPayload)
        .catch((e: Error) => toast.error(e.message)),
    [fetchCrm],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const leads = useMemo(
    () =>
      (payload?.leads ?? []).filter((lead) =>
        `${lead.buyer_name} ${lead.buyer_email ?? ""} ${lead.buyer_phone ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [payload, query],
  );
  const changeStatus = async (leadId: string, status: string) => {
    setBusy(leadId);
    try {
      await saveLead({
        data: { leadId, status: status as "new" | "contacted" | "negotiating" | "won" | "lost" },
      });
      toast.success("تم تحديث مرحلة العميل");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <SiteHeader />
      <main className="container-souqly flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-primary">{payload?.workspace.companyName}</p>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ContactRound className="h-6 w-6" />
              إدارة العملاء CRM
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link to="/company-workspace">مساحة العمل</Link>
          </Button>
        </div>
        <div className="relative mb-5 max-w-md">
          <Search className="absolute end-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو البريد"
            className="pe-10"
          />
        </div>
        {!payload ? (
          <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-primary" />
        ) : leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-12 text-center text-muted-foreground">
            لا توجد فرص عملاء مطابقة حاليًا.
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong>{lead.buyer_name}</strong>
                    <Badge variant="secondary">{labels[lead.status] ?? lead.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lead.buyer_phone || lead.buyer_email || "لا توجد وسيلة تواصل"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lead.listings?.title_ar || lead.listings?.title_en}
                  </p>
                </div>
                <Select
                  value={lead.status}
                  disabled={busy === lead.id || !payload.workspace.canManageCrm}
                  onValueChange={(status) => void changeStatus(lead.id, status)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(labels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
