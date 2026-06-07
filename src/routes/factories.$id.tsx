import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/factories/$id")({
  notFoundComponent: () => <div className="p-10 text-center">Not found</div>,
  errorComponent: () => <div className="p-10 text-center">Error</div>,
  component: FactoryProfile,
});

function FactoryProfile() {
  const { id } = Route.useParams();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [factory, setFactory] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: f } = await (supabase.from as any)("factories").select("*").eq("company_id", id).maybeSingle();
      setFactory(f);
      const { data: c } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
      setCompany(c);
    })();
  }, [id]);

  if (!company) return <div className="p-10 text-center">…</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 space-y-6">
        <div className="flex items-center gap-4">
          {company.logo_url && <img src={company.logo_url} className="h-20 w-20 rounded-lg object-cover" alt="" />}
          <div>
            <h1 className="text-3xl font-bold">{ar ? company.name_ar : company.name_en}</h1>
            <div className="flex gap-2 mt-1">
              {factory?.verified && <Badge>{ar ? "مصنع موثق" : "Verified factory"}</Badge>}
              {factory?.export_available && <Badge variant="secondary">{ar ? "متاح للتصدير" : "Export"}</Badge>}
            </div>
          </div>
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
