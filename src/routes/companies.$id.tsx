import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Mail, Globe, Phone, MessageCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { TrustBadge, profileCompletion } from "@/components/TrustBadges";
import { CompanyReviews } from "@/components/CompanyReviews";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { initialOf } from "@/lib/marketplace";
import { getCompanyContact } from "@/lib/companies.functions";
import { ShareMenu } from "@/components/ShareMenu";
import { companyCaption } from "@/lib/share-captions";

export const Route = createFileRoute("/companies/$id")({
  loader: async ({ params }) => {
    const { getCompanyMeta } = await import("@/lib/seo.functions");
    return { meta: await getCompanyMeta({ data: { id: params.id } }) };
  },
  head: ({ loaderData, params }) => {
    const m = loaderData?.meta;
    const title = m ? `${m.name_en ?? m.name_ar ?? "Company"} — Souqly` : "Company — Souqly";
    const desc = (m?.description_en ?? m?.description_ar ?? `${m?.industry ?? "B2B"} company on Souqly.`).slice(0, 160);
    const img = m?.cover_url ?? m?.logo_url ?? undefined;
    const url = `/companies/${params.id}`;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "profile" }, { property: "og:url", content: url },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => <Shell><div className="p-10 text-center">Company not found</div></Shell>,
  errorComponent: () => <Shell><div className="p-10 text-center">Something went wrong</div></Shell>,
  component: CompanyProfile,
});

type Company = {
  id: string; name_ar: string; name_en: string;
  description_ar: string | null; description_en: string | null;
  industry: string | null; country: string | null; city: string | null;
  logo_url: string | null; cover_url: string | null;
  is_verified: boolean; is_premium: boolean | null;
};

type Contact = { email: string | null; phone: string | null; website: string | null };

const COMPANY_PUBLIC_COLS =
  "id, name_ar, name_en, description_ar, description_en, industry, country, city, logo_url, cover_url, is_verified, is_premium";

function CompanyProfile() {
  const { id } = Route.useParams();
  const { locale, t } = useI18n();
  const [company, setCompany] = useState<Company | null>(null);
  const [contact, setContact] = useState<Contact>({ email: null, phone: null, website: null });
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const loadContact = useServerFn(getCompanyContact);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("companies").select(COMPANY_PUBLIC_COLS).eq("id", id).maybeSingle();
      setCompany(data as Company | null);
      if (data) {
        const { data: items } = await supabase
          .from("listings")
          .select("id, type, title_ar, title_en, images, price, currency, country, commission_percentage, featured, company_id, companies(name_ar, name_en)")
          .eq("company_id", id)
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        setListings((items ?? []) as unknown as ListingCardData[]);
        // Reveal contact only to authenticated users; anon gets a graceful fallback.
        try {
          const { data: sess } = await supabase.auth.getSession();
          if (sess.session) {
            const c = await loadContact({ data: { id } });
            setContact(c);
          }
        } catch { /* ignore — anon or transient */ }
      }
      setLoading(false);
    })();
  }, [id, loadContact]);


  if (loading) return <Shell><div className="p-10 text-center text-muted-foreground">{t("loading")}</div></Shell>;
  if (!company) return <Shell><div className="p-10 text-center">Company not found</div></Shell>;

  const name = locale === "ar" ? company.name_ar : company.name_en;
  const desc = locale === "ar" ? company.description_ar : company.description_en;

  return (
    <Shell>
      <section className="hero-gradient text-primary-foreground" style={company.cover_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), url(${company.cover_url})`, backgroundSize: "cover" } : undefined}>
        <div className="container-souqly py-10 flex flex-col md:flex-row md:items-center gap-6">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="h-24 w-24 rounded-lg object-cover bg-primary-foreground/15" />
          ) : (
            <div className="h-24 w-24 rounded-lg bg-primary-foreground/15 grid place-items-center text-4xl font-bold">{initialOf(name)}</div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{name}</h1>
              {company.is_verified && <TrustBadge kind="verified_company" />}
              {company.is_premium && <TrustBadge kind="premium_company" />}
            </div>
            {company.industry && <p className="opacity-90 mt-1">{company.industry}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm opacity-90 flex-wrap">
              {company.country && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[company.city, company.country].filter(Boolean).join(", ")}</span>}
              <Badge variant="secondary">{listings.length} {t("listings_count")}</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {contact.phone && (
              <>
                <Button asChild className="gap-2 bg-success hover:bg-success/90">
                  <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />{t("contact_whatsapp")}</a>
                </Button>
                <Button asChild variant="secondary" className="gap-2">
                  <a href={`tel:${contact.phone}`}><Phone className="h-4 w-4" />{t("call_now")}</a>
                </Button>
              </>
            )}
            {!contact.phone && contact.email && (
              <Button asChild variant="secondary" className="gap-2">
                <a href={`mailto:${contact.email}`}><Mail className="h-4 w-4" />{t("contact_company")}</a>
              </Button>
            )}
            {!contact.phone && !contact.email && (
              <Button asChild variant="secondary" className="gap-2">
                <Link to="/auth"><MessageCircle className="h-4 w-4" />{locale === "ar" ? "سجّل الدخول للتواصل" : "Sign in to contact"}</Link>
              </Button>
            )}
            <ShareMenu
              url={`/companies/${company.id}`}
              title={name}
              caption={companyCaption({ locale, nameAr: company.name_ar, nameEn: company.name_en, industry: company.industry, governorate: null, city: company.city })}
            />
          </div>

        </div>
      </section>
      <section className="container-souqly py-8 flex-1 grid lg:grid-cols-3 gap-6">
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">{t("profile_completion")}</span>
              <span className="text-muted-foreground">{profileCompletion(company)}%</span>
            </div>
            <Progress value={profileCompletion(company)} />
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-card">
            <h2 className="font-semibold mb-2">{t("about")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{desc ?? "—"}</p>
            <div className="mt-4 space-y-2 text-sm">
              {contact.website && <div className="flex items-center gap-2 text-muted-foreground"><Globe className="h-4 w-4" /> <a href={contact.website} target="_blank" rel="noreferrer" className="hover:text-primary truncate">{contact.website}</a></div>}
              {contact.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {contact.email}</div>}
              {contact.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" />{contact.phone}</div>}
              {!contact.website && !contact.email && !contact.phone && (
                <div className="text-muted-foreground text-xs">{locale === "ar" ? "سجّل الدخول لرؤية بيانات التواصل." : "Sign in to view contact details."}</div>
              )}
            </div>

          </div>
          <Button asChild variant="outline" className="w-full"><Link to="/companies">← {t("nav_companies")}</Link></Button>
        </aside>
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t("portfolio")}</h2>
            {listings.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">{t("no_listings_yet")}</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {listings.map((l) => <ListingCard key={l.id} l={l} />)}
              </div>
            )}
          </div>
          <CompanyReviews companyId={company.id} />
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col"><SiteHeader />{children}<SiteFooter /></div>;
}
