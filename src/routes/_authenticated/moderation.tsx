import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Check, X, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import {
  listModerationQueue,
  setListingStatus,
  adminDeleteListing,
} from "@/lib/moderation.functions";

export const Route = createFileRoute("/_authenticated/moderation")({
  head: () => ({ meta: [{ title: "مراجعة الإعلانات — سوقلي" }] }),
  component: ModerationPage,
});

type Row = {
  id: string;
  type: string;
  title_ar: string;
  title_en: string;
  status: "draft" | "pending" | "approved" | "rejected";
  images: string[] | null;
  country: string | null;
  city: string | null;
  companies: { name_ar: string | null; name_en: string | null } | null;
};

function ModerationPage() {
  const { t, locale } = useI18n();
  const { roles } = useAuth();
  const fetchQueue = useServerFn(listModerationQueue);
  const setStatus = useServerFn(setListingStatus);
  const del = useServerFn(adminDeleteListing);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);

  const isAdmin = roles.includes("admin");

  const load = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await fetchQueue();
      setRows(r as unknown as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-surface-2">
        <SiteHeader />
        <div className="container-souqly py-10 flex-1 text-center text-muted-foreground">
          Admin only
        </div>
        <SiteFooter />
      </div>
    );
  }

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success(t("status_updated"));
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const statusBadge = (s: Row["status"]) => {
    const map: Record<string, string> = {
      pending: "bg-warning/10 text-warning",
      approved: "bg-success/10 text-success",
      rejected: "bg-destructive/10 text-destructive",
      draft: "bg-muted text-muted-foreground",
    };
    return <Badge className={`${map[s]} hover:${map[s]}`}>{t(`moderation_${s}` as never)}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <ShieldCheck className="h-6 w-6 text-primary" />
          {t("moderation_title")}
        </h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-primary hover:bg-primary-hover" : ""}
            >
              {t(`moderation_${f}` as never)}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">{t("moderation_empty")}</div>
        ) : (
          <div className="rounded-lg border border-border bg-card divide-y divide-border">
            {filtered.map((r) => {
              const title = (locale === "ar" ? r.title_ar : r.title_en) ?? "";
              const co = r.companies
                ? ((locale === "ar" ? r.companies.name_ar : r.companies.name_en) ?? "")
                : "";
              return (
                <div key={r.id} className="p-4 flex items-center gap-4 flex-wrap">
                  <img
                    src={
                      r.images?.[0] ??
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23e2e8f0'/></svg>"
                    }
                    alt=""
                    className="h-16 w-20 object-cover rounded border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {co} · {[r.city, r.country].filter(Boolean).join(", ") || "—"} ·{" "}
                      {t(`cat_${r.type}` as never)}
                    </div>
                  </div>
                  {statusBadge(r.status)}
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/listings/$id" params={{ id: r.id }}>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                    {r.status !== "approved" && (
                      <Button
                        size="sm"
                        className="bg-success hover:bg-success/90 gap-1"
                        onClick={() =>
                          act(() => setStatus({ data: { id: r.id, status: "approved" } }))
                        }
                      >
                        <Check className="h-3 w-3" />
                        {t("approve")}
                      </Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() =>
                          act(() => setStatus({ data: { id: r.id, status: "rejected" } }))
                        }
                      >
                        <X className="h-3 w-3" />
                        {t("reject")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete?")) act(() => del({ data: { id: r.id } }));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
