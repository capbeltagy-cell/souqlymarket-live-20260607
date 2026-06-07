import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getCompanyProfileExtra, upsertMyCompanyProfileExtra } from "@/lib/phase3.functions";

export const Route = createFileRoute("/_authenticated/company-profile-extra")({ component: CompanyProfileExtra });

function CompanyProfileExtra() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { user } = useAuth();
  const [cover, setCover] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [achievements, setAchievements] = useState("");
  const [catalog, setCatalog] = useState("");
  const [gallery, setGallery] = useState("");

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: c } = await supabase.from("companies").select("id").eq("owner_id", user.id).maybeSingle();
      if (!c) return;
      const r = await getCompanyProfileExtra({ data: { companyId: c.id } });
      const e = r.extra;
      if (e) {
        setCover(e.cover_url ?? "");
        setWhatsapp(e.whatsapp ?? "");
        setWebsite(e.website ?? "");
        setAchievements((e.achievements ?? []).join("\n"));
        setCatalog((e.catalog_pdfs ?? []).map((p: any) => `${p.name}|${p.url}`).join("\n"));
        setGallery((e.gallery ?? []).join("\n"));
      }
    })();
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const catalog_pdfs = catalog.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
        const [name, url] = line.split("|");
        return { name: (name ?? "PDF").trim(), url: (url ?? name).trim() };
      });
      await upsertMyCompanyProfileExtra({ data: {
        cover_url: cover || undefined,
        whatsapp: whatsapp || undefined,
        website: website || undefined,
        achievements: achievements.split("\n").map((s) => s.trim()).filter(Boolean),
        catalog_pdfs,
        gallery: gallery.split("\n").map((s) => s.trim()).filter(Boolean),
      } });
      toast.success(ar ? "تم الحفظ" : "Saved");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container-souqly py-10 flex-1 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">{ar ? "ملف الشركة - معلومات إضافية" : "Company Profile - Extra"}</h1>
        <p className="text-muted-foreground mb-6">{ar ? "أضف صورة غلاف، معرض، كتالوجات، رقم واتساب، وإنجازات" : "Add cover image, gallery, catalogs, WhatsApp, achievements"}</p>
        <form onSubmit={save} className="space-y-3">
          <Input placeholder={ar ? "رابط صورة الغلاف" : "Cover image URL"} value={cover} onChange={(e) => setCover(e.target.value)} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder={ar ? "رقم واتساب" : "WhatsApp"} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            <Input placeholder={ar ? "الموقع الإلكتروني" : "Website"} value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <Textarea rows={4} placeholder={ar ? "الإنجازات (سطر لكل إنجاز)" : "Achievements (one per line)"} value={achievements} onChange={(e) => setAchievements(e.target.value)} />
          <Textarea rows={4} placeholder={ar ? "صور المعرض (رابط لكل سطر)" : "Gallery image URLs (one per line)"} value={gallery} onChange={(e) => setGallery(e.target.value)} />
          <Textarea rows={4} placeholder={ar ? "الكتالوجات (الاسم|الرابط)" : "Catalog PDFs (name|url per line)"} value={catalog} onChange={(e) => setCatalog(e.target.value)} />
          <Button type="submit" className="bg-primary hover:bg-primary-hover">{ar ? "حفظ" : "Save"}</Button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}
