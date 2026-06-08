import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, Loader2, Crown, BadgeCheck, Star, Trash2, Ban, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { superCheck, superOverview, superList, superAction } from "@/lib/super-admin.functions";
import { toast } from "sonner";

const ALLOWED = ["capbeltagy@gmail.com", "capbeltagy95@gmail.com"];

export const Route = createFileRoute("/control-center-x7")({
  ssr: false,
  head: () => ({ meta: [{ title: "Control Center" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ControlCenter,
});

function ControlCenter() {
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const check = useServerFn(superCheck);
  const ov = useServerFn(superOverview);

  useEffect(() => {
    if (loading) return;
    if (!user) { setAuthorized(false); return; }
    const email = (user.email ?? "").toLowerCase();
    if (!ALLOWED.includes(email)) { setAuthorized(false); return; }
    check().then(() => {
      setAuthorized(true);
      ov().then(setOverview).catch(() => {});
    }).catch(() => setAuthorized(false));
  }, [user, loading]);

  if (loading || authorized === null) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="text-center max-w-sm">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {user ? "You are not authorized to view this page." : "Please sign in with an authorized account."}
          </p>
          {!user && (
            <Button className="mt-4" onClick={() => { window.location.href = "/auth"; }}>Sign in</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="border-b border-border bg-surface">
        <div className="container-souqly py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Super Admin Control Center</h1>
            <Badge variant="outline" className="text-xs">{user?.email}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}>Sign out</Button>
        </div>
      </header>

      <main className="container-souqly py-6 space-y-6">
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Stat label="Companies" value={overview.counts.companies} />
            <Stat label="Paid" value={overview.paidCompanies} />
            <Stat label="Verified" value={overview.verifiedCompanies} />
            <Stat label="Agents" value={overview.counts.agents} />
            <Stat label="Listings" value={overview.counts.listings} />
            <Stat label="Featured" value={overview.featuredListings} />
            <Stat label="Leads" value={overview.counts.leads} />
            <Stat label="RFQs" value={overview.counts.rfqs} />
            <Stat label="Wholesale" value={overview.counts.wholesale_listings} />
            <Stat label="Factories" value={overview.counts.factories} />
            <Stat label="Tenders" value={overview.counts.tenders} />
            <Stat label="Users" value={overview.counts.profiles} />
          </div>
        )}

        <Tabs defaultValue="companies">
          <TabsList className="flex-wrap h-auto">
            {["companies", "users", "agents", "listings", "leads", "rfqs", "wholesale_listings", "factories", "tenders", "subscriptions", "company_referrals"].map((e) => (
              <TabsTrigger key={e} value={e}>{e.replace("_", " ")}</TabsTrigger>
            ))}
          </TabsList>
          {["companies", "users", "agents", "listings", "leads", "rfqs", "wholesale_listings", "factories", "tenders", "subscriptions", "company_referrals"].map((e) => (
            <TabsContent key={e} value={e}><EntityPanel entity={e} /></TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function EntityPanel({ entity }: { entity: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useServerFn(superList);
  const act = useServerFn(superAction);

  const refresh = async () => {
    setBusy(true);
    try { setRows(await list({ data: { entity: entity as any, limit: 100 } })); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, [entity]);

  const run = async (action: string, id: string, payload?: any) => {
    try {
      await act({ data: { action: action as any, entity, id, payload } });
      toast.success("Done");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  if (busy) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!rows.length) return <div className="py-8 text-center text-muted-foreground">No data</div>;

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">{rows.length} rows</div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <tbody>
            {rows.slice(0, 50).map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3 align-top">
                  <div className="font-medium truncate max-w-md">
                    {r.title_ar || r.title_en || r.title || r.name_ar || r.name_en || r.name || r.email || r.subject || r.id}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate max-w-md">{r.id}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {r.is_verified && <Badge variant="outline" className="text-[10px]">verified</Badge>}
                    {r.featured && <Badge variant="outline" className="text-[10px]">featured</Badge>}
                    {r.subscription_plan === "paid" && <Badge variant="outline" className="text-[10px]">paid</Badge>}
                    {r.status && <Badge variant="outline" className="text-[10px]">{r.status}</Badge>}
                    {r.banned_until && <Badge variant="destructive" className="text-[10px]">banned</Badge>}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <div className="flex flex-wrap gap-1 justify-end">
                    {entity === "companies" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => run(r.is_verified ? "unverify_company" : "verify_company", r.id)}><BadgeCheck className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => run(r.subscription_plan === "paid" ? "mark_unpaid" : "mark_paid", r.id)}><Crown className="h-3 w-3" /></Button>
                      </>
                    )}
                    {entity === "listings" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => run("approve_listing", r.id)}><CheckCircle2 className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => run("reject_listing", r.id)}><XCircle className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => run(r.featured ? "unfeature_listing" : "feature_listing", r.id, { days: 7 })}><Star className="h-3 w-3" /></Button>
                      </>
                    )}
                    {entity === "users" && (
                      <Button size="sm" variant="outline" onClick={() => run(r.banned_until ? "unban_user" : "ban_user", r.id)}><Ban className="h-3 w-3" /></Button>
                    )}
                    {entity !== "users" && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) run("delete", r.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
