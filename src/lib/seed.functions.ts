import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_USERS = [
  { email: "demo.cairo.realestate@souqly.app", full_name: "Ahmed Hassan", role: "company" as const,
    company: { name_ar: "العقارات الذهبية", name_en: "Golden Real Estate", industry: "Real Estate",
      country: "Egypt", city: "Cairo", description_ar: "شركة رائدة في تطوير وبيع العقارات الفاخرة بالقاهرة الجديدة.",
      description_en: "Leading developer of premium residential and commercial properties in New Cairo.",
      phone: "+201001234567", email: "info@golden-eg.com", website: "https://golden-eg.com" } },
  { email: "demo.alex.industry@souqly.app", full_name: "Mona Saleh", role: "company" as const,
    company: { name_ar: "مصانع الإسكندرية للحديد", name_en: "Alexandria Steel Works", industry: "Manufacturing",
      country: "Egypt", city: "Alexandria", description_ar: "أكبر مصنع لتصنيع الحديد والصلب في شمال مصر.",
      description_en: "Largest steel manufacturing plant in northern Egypt.",
      phone: "+201112233445", email: "sales@alexsteel.eg", website: "https://alexsteel.eg" } },
  { email: "demo.giza.solutions@souqly.app", full_name: "Karim Adel", role: "company" as const,
    company: { name_ar: "حلول الجيزة الرقمية", name_en: "Giza Digital Solutions", industry: "Technology",
      country: "Egypt", city: "Giza", description_ar: "خدمات تطوير البرمجيات والتسويق الرقمي للشركات.",
      description_en: "Software development and digital marketing services for enterprises.",
      phone: "+201223344556", email: "hello@gizadigital.com", website: "https://gizadigital.com" } },
];

const DEMO_AGENTS = [
  { email: "demo.agent.layla@souqly.app", full_name: "Layla Mostafa",
    headline_ar: "خبيرة عقارات بالقاهرة الكبرى", headline_en: "Greater Cairo real estate specialist",
    bio_ar: "خمس سنوات في تسويق العقارات السكنية والتجارية بمصر الجديدة والتجمع.",
    bio_en: "5+ years marketing residential and commercial properties in New Cairo & Heliopolis.",
    country: "Egypt", city: "Cairo", specialties: ["Real Estate", "Luxury Villas"], languages: ["AR", "EN"] },
  { email: "demo.agent.youssef@souqly.app", full_name: "Youssef Tarek",
    headline_ar: "مسوّق منتجات صناعية", headline_en: "Industrial products sales agent",
    bio_ar: "متخصص في بيع المنتجات الصناعية والمعدات الثقيلة بمحافظات الصعيد.",
    bio_en: "Specialized in industrial products and heavy equipment across Upper Egypt.",
    country: "Egypt", city: "Asyut", specialties: ["Industrial", "Manufacturing"], languages: ["AR"] },
  { email: "demo.agent.nada@souqly.app", full_name: "Nada Ibrahim",
    headline_ar: "خدمات وتسويق رقمي", headline_en: "Services & digital marketing",
    bio_ar: "تربط بين الشركات الناشئة ومقدمي خدمات التكنولوجيا في القاهرة.",
    bio_en: "Connects startups with technology service providers in Cairo.",
    country: "Egypt", city: "Cairo", specialties: ["Services", "Technology"], languages: ["AR", "EN"] },
];

const DEMO_LISTINGS = [
  { companyIdx: 0, type: "real_estate" as const,
    title_ar: "فيلا فاخرة بالتجمع الخامس", title_en: "Luxury villa in 5th Settlement",
    description_ar: "فيلا 4 غرف مع حمام سباحة وحديقة خاصة في كمبوند راقٍ بالقاهرة الجديدة.",
    description_en: "4-bedroom villa with pool and private garden in a premium New Cairo compound.",
    price: 850000, currency: "USD", city: "Cairo", commission: 3,
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200" },
  { companyIdx: 0, type: "real_estate" as const,
    title_ar: "شقة بإطلالة على النيل بالزمالك", title_en: "Nile-view apartment in Zamalek",
    description_ar: "شقة 200م بإطلالة بانورامية على نهر النيل، تشطيب فندقي.",
    description_en: "200 sqm apartment with panoramic Nile view, hotel-grade finishing.",
    price: 420000, currency: "USD", city: "Cairo", commission: 4,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200" },
  { companyIdx: 1, type: "factory" as const,
    title_ar: "مصنع حديد للبيع بالعامرية", title_en: "Operating steel plant for sale — Amreya",
    description_ar: "مصنع حديد متكامل بمساحة 8000م، طاقة إنتاجية 50 طن/يوم، جميع التراخيص سارية.",
    description_en: "Turnkey 8,000 sqm steel facility, 50t/day capacity, all permits active.",
    price: 5500000, currency: "USD", city: "Alexandria", commission: 2,
    image: "https://images.unsplash.com/photo-1565793979206-6d44ff3b1c69?w=1200" },
  { companyIdx: 1, type: "product" as const,
    title_ar: "أعمدة حديد إنشائي بالطن", title_en: "Structural steel rebar — bulk",
    description_ar: "حديد تسليح مطابق للمواصفات المصرية، تسليم بالموقع داخل مصر.",
    description_en: "Egyptian-spec reinforcement steel, nationwide site delivery.",
    price: 720, currency: "USD", city: "Alexandria", commission: 6,
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200" },
  { companyIdx: 2, type: "service" as const,
    title_ar: "تطوير تطبيقات الويب والموبايل", title_en: "Web & mobile app development",
    description_ar: "فريق تطوير كامل لإطلاق منتجك التقني خلال 60 يوماً.",
    description_en: "End-to-end product team to ship your tech product in 60 days.",
    price: 15000, currency: "USD", city: "Giza", commission: 10,
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200" },
  { companyIdx: 2, type: "opportunity" as const,
    title_ar: "فرصة استثمارية في منصة SaaS", title_en: "SaaS platform investment opportunity",
    description_ar: "جولة استثمارية لتوسعة منصة SaaS بحصة 15% من رأس المال.",
    description_en: "Series-A round to scale a regional SaaS platform — 15% equity available.",
    price: 250000, currency: "USD", city: "Giza", commission: 5,
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200" },
];

export const seedEgyptDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const companyIds: string[] = [];
    for (const u of DEMO_USERS) {
      let uid: string | null = null;
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: u.email, password: "DemoSouqly!2026", email_confirm: true,
        user_metadata: { full_name: u.full_name, role: u.role },
      });
      if (cErr) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        uid = list.users.find((x) => x.email === u.email)?.id ?? null;
      } else uid = created.user?.id ?? null;
      if (!uid) throw new Error(`Failed to provision ${u.email}`);

      await supabaseAdmin.from("profiles").upsert({ id: uid, full_name: u.full_name });
      await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "company" }, { onConflict: "user_id,role" });

      const { data: existing } = await supabaseAdmin.from("companies").select("id").eq("owner_id", uid).maybeSingle();
      let cid = existing?.id;
      if (!cid) {
        const { data: ins, error } = await supabaseAdmin.from("companies").insert({ owner_id: uid, is_verified: true, ...u.company }).select("id").single();
        if (error) throw new Error(error.message);
        cid = ins.id;
      } else {
        await supabaseAdmin.from("companies").update({ is_verified: true, ...u.company }).eq("id", cid);
      }
      companyIds.push(cid!);
    }

    for (const a of DEMO_AGENTS) {
      let uid: string | null = null;
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: a.email, password: "DemoSouqly!2026", email_confirm: true,
        user_metadata: { full_name: a.full_name, role: "agent" },
      });
      if (cErr) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        uid = list.users.find((x) => x.email === a.email)?.id ?? null;
      } else uid = created.user?.id ?? null;
      if (!uid) throw new Error(`Failed to provision ${a.email}`);

      await supabaseAdmin.from("profiles").upsert({ id: uid, full_name: a.full_name });
      await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "agent" }, { onConflict: "user_id,role" });
      await supabaseAdmin.from("agents").upsert({
        user_id: uid, is_verified: true,
        headline_ar: a.headline_ar, headline_en: a.headline_en,
        bio_ar: a.bio_ar, bio_en: a.bio_en,
        country: a.country, city: a.city,
        specialties: a.specialties, languages: a.languages,
      }, { onConflict: "user_id" });
    }

    for (const l of DEMO_LISTINGS) {
      const cid = companyIds[l.companyIdx];
      const { data: dup } = await supabaseAdmin.from("listings").select("id").eq("company_id", cid).eq("title_en", l.title_en).maybeSingle();
      if (dup) continue;
      const { error } = await supabaseAdmin.from("listings").insert({
        company_id: cid, type: l.type,
        title_ar: l.title_ar, title_en: l.title_en,
        description_ar: l.description_ar, description_en: l.description_en,
        price: l.price, currency: l.currency,
        country: "Egypt", city: l.city,
        commission_percentage: l.commission,
        images: [l.image], status: "approved", featured: true,
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true, companies: companyIds.length, agents: DEMO_AGENTS.length, listings: DEMO_LISTINGS.length };
  });
