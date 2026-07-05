import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustBadge } from "@/components/TrustBadges";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getCompanyContact } from "@/lib/companies.functions";

export const Route = createFileRoute("/factories/$id")({
  notFoundComponent: () => <Fallback msg="Factory not found" />,
  errorComponent: () => <Fallback msg="Something went wrong" />,
  component: FactoryProfile,
});

function FactoryProfile() {
  const { id } = Route.useParams();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [factory, setFactory] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const loadContact = useServerFn(getCompanyContact);

  useEffect(() => {
    (async () => {
      const { data: f } = await (supabase.from as any)("factories").select("*").eq("company_id", id).maybeSingle();
      setFactory(f);
      const { data: c } = await supabase
        .from("companies")
        .select("id, name_ar, name_en, logo_url, cover_url, industry, is_verified")
        .eq("id", id).maybeSingle();
      setCompany(c);
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) {
          const contact = await loadContact({ data: { id } });
          setPhone(contact.phone);
        }
      } catch { /* anon */ }
    })();
  }, [id, loadContact]);

  if (!company) return <div className="p-10 text-center">…</div>;

  const wa = phone?.replace(/[^0-9]/g, "");

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {company.logo_url && <img src={company.logo_url} className="h-20 w-20 rounded-lg object-cover" alt="" />}
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{ar ? company.name_ar : company.name_en}</h1>
            <div className="flex gap-2 mt-2 flex-wrap">
              {company.is_verified && <TrustBadge kind="verified_company" />}
              {factory?.verified && <Badge>{ar ? "مصنع موثق" : "Verified factory"}</Badge>}
              {factory?.export_available && <Badge variant="secondary">{ar ? "متاح للتصدير" : "Export"}</Badge>}
            </div>
          </div>
          {wa && (
            <div className="flex flex-col gap-2">
              <Button asChild className="gap-2 bg-success hover:bg-success/90">
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />{ar ? "واتساب" : "WhatsApp"}</a>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <a href={`tel:+${wa}`}><Phone className="h-4 w-4" />{ar ? "اتصال" : "Call"}</a>
              </Button>
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Info label={ar ? "المحافظة" : "Governorate"} value={company.governorate ?? company.city ?? company.country} />
          <Info label={ar ? "الطاقة الإنتاجية" : "Production capacity"} value={factory?.production_capacity} />
          <Info label={ar ? "عدد العاملين" : "Employees"} value={factory?.employees_range} />
          <Info label={ar ? "الشهادات" : "Certifications"} value={(factory?.certifications ?? []).join(", ") || "—"} />
        </div>
        <p className="whitespace-pre-wrap text-muted-foreground">{ar ? company.description_ar : company.description_en}</p>
        <Link to="/companies/$id" params={{ id: company.id }} className="text-primary underline">{ar ? "الملف الكامل للشركة" : "Full company profile"}</Link>
      </section>
      <SiteFooter />
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value ?? "—"}</div></div>;
}


function Fallback({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 grid place-items-center p-10 text-center text-muted-foreground">{msg}</div>
      <SiteFooter />
    </div>
  );
}
