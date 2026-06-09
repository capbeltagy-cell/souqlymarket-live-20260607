import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_USERS = [
  { email: "demo.cairo.realestate@souqly.app", full_name: "Ahmed Hassan", role: "company" as const,
    company: { name_ar: "العقارات الذهبية", name_en: "Golden Real Estate", industry: "Real Estate", category_slug: "real-estate",
      country: "Egypt", city: "Cairo", description_ar: "شركة رائدة في تطوير وبيع العقارات الفاخرة بالقاهرة الجديدة.",
      description_en: "Leading developer of premium residential and commercial properties in New Cairo.",
      phone: "+201001234567", email: "info@golden-eg.com", website: "https://golden-eg.com" } },
  { email: "demo.alex.industry@souqly.app", full_name: "Mona Saleh", role: "company" as const,
    company: { name_ar: "مصانع الإسكندرية للحديد", name_en: "Alexandria Steel Works", industry: "Manufacturing", category_slug: "industrial-equipment",
      country: "Egypt", city: "Alexandria", description_ar: "أكبر مصنع لتصنيع الحديد والصلب في شمال مصر.",
      description_en: "Largest steel manufacturing plant in northern Egypt.",
      phone: "+201112233445", email: "sales@alexsteel.eg", website: "https://alexsteel.eg" } },
  { email: "demo.giza.solutions@souqly.app", full_name: "Karim Adel", role: "company" as const,
    company: { name_ar: "حلول الجيزة الرقمية", name_en: "Giza Digital Solutions", industry: "Technology", category_slug: "services",
      country: "Egypt", city: "Giza", description_ar: "خدمات تطوير البرمجيات والتسويق الرقمي للشركات.",
      description_en: "Software development and digital marketing services for enterprises.",
      phone: "+201223344556", email: "hello@gizadigital.com", website: "https://gizadigital.com" } },
  { email: "demo.cairo.security@souqly.app", full_name: "Ahmed Farid", role: "company" as const,
    company: { name_ar: "القاهرة لحلول الأمان", name_en: "Cairo Security Solutions", industry: "CCTV & Security", category_slug: "cctv-cameras",
      country: "Egypt", city: "Cairo", description_ar: "شريك مصري يقدم حلول كاميرات المراقبة والأمن للمباني التجارية والسكنية.",
      description_en: "Egyptian partner providing CCTV and security systems for commercial and residential properties.",
      phone: "+201015678901", email: "contact@cairosecurity.eg", website: "https://cairosecurity.eg" } },
  { email: "demo.giza.solar@souqly.app", full_name: "Sara Mostafa", role: "company" as const,
    company: { name_ar: "جولدن سولار جيزة", name_en: "Golden Solar Giza", industry: "Solar Energy", category_slug: "solar-panels",
      country: "Egypt", city: "Giza", description_ar: "توريد وتركيب ألواح شمسية وحلول طاقة متجددة للمشاريع الصناعية والتجارية.",
      description_en: "Supply and installation of solar panels and renewable energy systems for industrial and commercial projects.",
      phone: "+201098765432", email: "sales@goldensolar.eg", website: "https://goldensolar.eg" } },
  { email: "demo.alex.electrical@souqly.app", full_name: "Omar Nabil", role: "company" as const,
    company: { name_ar: "الإسكندرية للكهرباء", name_en: "Alexandria Electrical Supplies", industry: "Electrical Supplies", category_slug: "electrical-supplies",
      country: "Egypt", city: "Alexandria", description_ar: "توريد كابلات، مفاتيح، قواطع كهربائية ومستلزمات إنشائية للمشاريع الكبرى.",
      description_en: "Supplier of cables, switches, breakers and electrical accessories for major projects.",
      phone: "+201122334455", email: "info@alexelectrical.eg", website: "https://alexelectrical.eg" } },
  { email: "demo.ps.logistics@souqly.app", full_name: "Hany Zaki", role: "company" as const,
    company: { name_ar: "بورت سعيد للخدمات اللوجستية", name_en: "Port Said Logistics Services", industry: "Logistics", category_slug: "logistics",
      country: "Egypt", city: "Port Said", description_ar: "حلول تخزين ونقل وتسليم شاملة للمصانع والموردين في المنطقة الشمالية.",
      description_en: "Comprehensive warehousing, transportation and delivery solutions for northern Egypt manufacturers and suppliers.",
      phone: "+201011223344", email: "operations@pslogistics.eg", website: "https://pslogistics.eg" } },
  { email: "demo.ismailia.packaging@souqly.app", full_name: "Dina Adel", role: "company" as const,
    company: { name_ar: "الإسماعيلية للتغليف", name_en: "Ismailia Packaging Solutions", industry: "Packaging", category_slug: "packaging",
      country: "Egypt", city: "Ismailia", description_ar: "تصنيع وتوريد عبوات ومواد تغليف للقطاع الغذائي والصناعي.",
      description_en: "Manufacturing and supplying packaging materials for food and industrial sectors.",
      phone: "+201012345678", email: "support@ismailiapack.eg", website: "https://ismailiapack.eg" } },
  { email: "demo.suez.construct@souqly.app", full_name: "Mahmoud Saad", role: "company" as const,
    company: { name_ar: "سويس لمواد البناء", name_en: "Suez Construction Supplies", industry: "Construction Materials", category_slug: "construction-materials",
      country: "Egypt", city: "Suez", description_ar: "توريد مواد البناء، الأسمنت، الرمل، والحديد للمقاولين في قناة السويس.",
      description_en: "Supplier of construction materials, cement, sand and steel for contractors in the Suez region.",
      phone: "+201015432187", email: "contact@suezconstruct.eg", website: "https://suezconstruct.eg" } },
  { email: "demo.mansoura.agro@souqly.app", full_name: "Amira Nader", role: "company" as const,
    company: { name_ar: "دلتا لمعدات الزراعة", name_en: "Delta Agriculture Equipment", industry: "Agriculture Equipment", category_slug: "agriculture-equipment",
      country: "Egypt", city: "Mansoura", description_ar: "توريد جرارات، مضخات مياه، ومعدات ري متقدمة للمزارع المصرية.",
      description_en: "Supplier of tractors, water pumps and precision irrigation equipment for Egyptian farms.",
      phone: "+201027654321", email: "sales@deltaagro.eg", website: "https://deltaagro.eg" } },
  { email: "demo.tanta.industrial@souqly.app", full_name: "Karim Fathy", role: "company" as const,
    company: { name_ar: "المنوفية للآلات الصناعية", name_en: "Menoufia Industrial Machines", industry: "Industrial Machines", category_slug: "industrial-machines",
      country: "Egypt", city: "Tanta", description_ar: "تصميم وتصنيع آلات معالجة وخطوط إنتاج للمشروعات الصناعية المتوسطة.",
      description_en: "Design and manufacture processing machines and production lines for mid-size industrial projects.",
      phone: "+201055667788", email: "info@menoufiamachines.eg", website: "https://menoufiamachines.eg" } },
  { email: "demo.cairo.building@souqly.app", full_name: "Nora Amin", role: "company" as const,
    company: { name_ar: "القاهرة لمواد البناء", name_en: "Cairo Building Materials", industry: "Construction Materials", category_slug: "construction-materials",
      country: "Egypt", city: "Cairo", description_ar: "مورد محلي موثوق لخرسانة، عوازل، وبلاطات أرضية للقطاع السكني والتجاري.",
      description_en: "Trusted local supplier of concrete, insulation and flooring materials for residential and commercial sectors.",
      phone: "+201099887766", email: "contact@cairobm.eg", website: "https://cairobm.eg" } },
  { email: "demo.alex.energy@souqly.app", full_name: "Youssef Samir", role: "company" as const,
    company: { name_ar: "إسكندرية للطاقة الذكية", name_en: "Alexandria Smart Energy", industry: "Solar & Electrical", category_slug: "solar-panels",
      country: "Egypt", city: "Alexandria", description_ar: "حلول تشطيب كهربائي وألواح شمسية للمباني التجارية والمصانع.",
      description_en: "Electrical finishing and solar panel solutions for commercial buildings and factories.",
      phone: "+201033221100", email: "sales@alexenergy.eg", website: "https://alexenergy.eg" } },
  { email: "demo.giza.electro@souqly.app", full_name: "Hatem Fadel", role: "company" as const,
    company: { name_ar: "الجيزة للمستلزمات الكهربائية", name_en: "Giza Electro Supply", industry: "Electrical Supplies", category_slug: "electrical-supplies",
      country: "Egypt", city: "Giza", description_ar: "مستودع مركزي لمنتجات الكهرباء الصناعية والسكنية وتوريدات المشاريع.",
      description_en: "Central warehouse for industrial and residential electrical products and project supplies.",
      phone: "+201012233344", email: "orders@gizaelectro.eg", website: "https://gizaelectro.eg" } },
  { email: "demo.ps.pack@souqly.app", full_name: "Salma Hossam", role: "company" as const,
    company: { name_ar: "حزمة البحر الأحمر", name_en: "Red Sea Packaging", industry: "Packaging", category_slug: "packaging",
      country: "Egypt", city: "Port Said", description_ar: "تغليف صناعي عالي الجودة للشحن البحري والتصدير.",
      description_en: "High-quality industrial packaging for sea freight and export shipments.",
      phone: "+201099112233", email: "info@redseapack.eg", website: "https://redseapack.eg" } },
  { email: "demo.ismailia.factory@souqly.app", full_name: "Omar Taha", role: "company" as const,
    company: { name_ar: "القناة للمصانع الصناعية", name_en: "Canal Industrial Manufacturing", industry: "Industrial Manufacturing", category_slug: "industrial-machines",
      country: "Egypt", city: "Ismailia", description_ar: "مصنع متخصص في خطوط إنتاج وتجميع الآلات الصناعية.",
      description_en: "Factory specialized in production lines and assembly of industrial machinery.",
      phone: "+201045678901", email: "contact@canalindustrial.eg", website: "https://canalindustrial.eg" } },
  { email: "demo.suez.solar@souqly.app", full_name: "Fatma Kamal", role: "company" as const,
    company: { name_ar: "سيناء للطاقة الشمسية", name_en: "Sinai Solar Fabrication", industry: "Solar Panels", category_slug: "solar-panels",
      country: "Egypt", city: "Suez", description_ar: "تصنيع وتجميع ألواح شمسية للحلول الصناعية والتجارية في السويس.",
      description_en: "Manufacture and assembly of solar panels for industrial and commercial solutions in Suez.",
      phone: "+201050607080", email: "sales@sinaisolar.eg", website: "https://sinaisolar.eg" } },
  { email: "demo.mansoura.agritech@souqly.app", full_name: "Ahmed Maloof", role: "company" as const,
    company: { name_ar: "دلتا لتقنيات الزراعة", name_en: "Delta AgroTech", industry: "Agriculture Equipment", category_slug: "agriculture-equipment",
      country: "Egypt", city: "Mansoura", description_ar: "حلول معدات زراعية ذكية للزراعة الدقيقة ومحاصيل قصب السكر.",
      description_en: "Smart agricultural equipment solutions for precision farming and sugarcane crops.",
      phone: "+201055443322", email: "info@deltaagrotech.eg", website: "https://deltaagrotech.eg" } },
  { email: "demo.tanta.logistics@souqly.app", full_name: "Mariam Hussein", role: "company" as const,
    company: { name_ar: "نيل اللوجستيات", name_en: "Nile Warehouse Logistics", industry: "Logistics", category_slug: "logistics",
      country: "Egypt", city: "Tanta", description_ar: "خدمات تخزين وتسليم سريعة للمنتجات الصناعية والزراعية بمحافظة المنوفية.",
      description_en: "Fast warehousing and delivery services for industrial and agricultural products in Monufia.",
      phone: "+201066554433", email: "hello@nilelogistics.eg", website: "https://nilelogistics.eg" } },
  { email: "demo.cairo.cctv@souqly.app", full_name: "Mona Fahmy", role: "company" as const,
    company: { name_ar: "القاهرة لكاميرات المراقبة", name_en: "Cairo CCTV & Security", industry: "CCTV Cameras", category_slug: "cctv-cameras",
      country: "Egypt", city: "Cairo", description_ar: "توريد وتركيب كاميرات مراقبة عالي الدقة مع خدمات صيانة دورية.",
      description_en: "High-resolution CCTV supply and installation with routine maintenance services.",
      phone: "+201023344556", email: "service@cairocctv.eg", website: "https://cairocctv.eg" } },
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
    price: 850000, currency: "EGP", city: "Cairo", commission: 3,
    image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200" },
  { companyIdx: 0, type: "real_estate" as const,
    title_ar: "شقة بإطلالة على النيل بالزمالك", title_en: "Nile-view apartment in Zamalek",
    description_ar: "شقة 200م بإطلالة بانورامية على نهر النيل، تشطيب فندقي.",
    description_en: "200 sqm apartment with panoramic Nile view, hotel-grade finishing.",
    price: 420000, currency: "EGP", city: "Cairo", commission: 4,
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200" },
  { companyIdx: 1, type: "factory" as const,
    title_ar: "مصنع حديد للبيع بالعامرية", title_en: "Operating steel plant for sale — Amreya",
    description_ar: "مصنع حديد متكامل بمساحة 8000م، طاقة إنتاجية 50 طن/يوم، جميع التراخيص سارية.",
    description_en: "Turnkey 8,000 sqm steel facility, 50t/day capacity, all permits active.",
    price: 5500000, currency: "EGP", city: "Alexandria", commission: 2,
    image: "https://images.unsplash.com/photo-1565793979206-6d44ff3b1c69?w=1200" },
  { companyIdx: 1, type: "product" as const,
    title_ar: "أعمدة حديد إنشائي بالطن", title_en: "Structural steel rebar — bulk",
    description_ar: "حديد تسليح مطابق للمواصفات المصرية، تسليم بالموقع داخل مصر.",
    description_en: "Egyptian-spec reinforcement steel, nationwide site delivery.",
    price: 720, currency: "EGP", city: "Alexandria", commission: 6,
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200" },
  { companyIdx: 2, type: "service" as const,
    title_ar: "تطوير تطبيقات الويب والموبايل", title_en: "Web & mobile app development",
    description_ar: "فريق تطوير كامل لإطلاق منتجك التقني خلال 60 يوماً.",
    description_en: "End-to-end product team to ship your tech product in 60 days.",
    price: 15000, currency: "EGP", city: "Giza", commission: 10,
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200" },
  { companyIdx: 2, type: "opportunity" as const,
    title_ar: "فرصة استثمارية في منصة SaaS", title_en: "SaaS platform investment opportunity",
    description_ar: "جولة استثمارية لتوسعة منصة SaaS بحصة 15% من رأس المال.",
    description_en: "Series-A round to scale a regional SaaS platform — 15% equity available.",
    price: 250000, currency: "EGP", city: "Giza", commission: 5,
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200" },
];

const DEMO_BUSINESS_CATEGORIES = [
  { slug: "cctv-cameras", name_ar: "كاميرات المراقبة", name_en: "CCTV Cameras", icon: "Camera", sort: 11 },
  { slug: "solar-panels", name_ar: "ألواح شمسية", name_en: "Solar Panels", icon: "Sun", sort: 12 },
  { slug: "electrical-supplies", name_ar: "مستلزمات كهربائية", name_en: "Electrical Supplies", icon: "Zap", sort: 13 },
  { slug: "construction-materials", name_ar: "مواد إنشائية", name_en: "Construction Materials", icon: "HardHat", sort: 14 },
  { slug: "agriculture-equipment", name_ar: "معدات زراعية", name_en: "Agriculture Equipment", icon: "Sprout", sort: 15 },
  { slug: "industrial-machines", name_ar: "آلات صناعية", name_en: "Industrial Machines", icon: "Cog", sort: 16 },
  { slug: "packaging", name_ar: "التغليف", name_en: "Packaging", icon: "Box", sort: 17 },
  { slug: "logistics", name_ar: "اللوجستيات", name_en: "Logistics", icon: "Truck", sort: 18 },
];

const DEMO_WHOLESALE_LISTINGS = [
  { companyIdx: 0, title: "نظام كاميرات مراقبة داخلي 4K", description: "حزمة كاميرات مراقبة عالية الدقة مع جهاز تسجيل NVR وخدمات تركيب سريعة.", category_slug: "cctv-cameras", governorate: "Cairo", price_per_unit: 2450, currency: "EGP", moq: 10, images: ["https://images.unsplash.com/photo-1593698057847-3d3b2f090a52?w=1200"] },
  { companyIdx: 16, title: "كاميرات PTZ للرصد الخارجي", description: "كاميرات PTZ متحركة بزاوية 360 درجة وميزة تتبع ذكية لمراقبة المصانع.", category_slug: "cctv-cameras", governorate: "Cairo", price_per_unit: 6800, currency: "EGP", moq: 5, images: ["https://images.unsplash.com/photo-1517511620798-cec17d428bc0?w=1200"] },
  { companyIdx: 3, title: "نظام إنذار وحماية متكامل", description: "تركيب شامل لأنظمة الإنذار، الحركة، والأبواب الذكية مع دعم فني كامل.", category_slug: "cctv-cameras", governorate: "Port Said", price_per_unit: 14999, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200"] },
  { companyIdx: 4, title: "أعمدة شمسية 540 واط", description: "لوحات شمسية أحادية البلورية بكفاءة عالية ومناسبة للمشروعات التجارية.", category_slug: "solar-panels", governorate: "Ismailia", price_per_unit: 8200, currency: "EGP", moq: 20, images: ["https://images.unsplash.com/photo-1543128639-4cb7e6f1bf02?w=1200"] },
  { companyIdx: 13, title: "مجموعة ألواح شمسية للتخزين المثالي", description: "حزمة ألواح شمسية مع ملحقات التأسيس والألواح المقاومة للغبار.", category_slug: "solar-panels", governorate: "Suez", price_per_unit: 7800, currency: "EGP", moq: 15, images: ["https://images.unsplash.com/photo-1509395176047-4a66953fd231?w=1200"] },
  { companyIdx: 9, title: "نظام إنارة بالطاقة الشمسية للمخازن", description: "حل شامل لإنارة المخازن الخارجية بالطاقة الشمسية مع بطاريات احتياطية.", category_slug: "solar-panels", governorate: "Alexandria", price_per_unit: 10999, currency: "EGP", moq: 8, images: ["https://images.unsplash.com/photo-1509395176047-4a66953fd231?w=1200"] },
  { companyIdx: 5, title: "قاطع كهرباء صناعي 630 أمبير", description: "قاطع تيار عالي الجودة مناسب للمحطات الكهربائية والمصانع.", category_slug: "electrical-supplies", governorate: "Suez", price_per_unit: 4250, currency: "EGP", moq: 6, images: ["https://images.unsplash.com/photo-1581092334490-4f133334c907?w=1200"] },
  { companyIdx: 10, title: "لوحة توزيع كهربائية معدنية 24 موصل", description: "لوحة توزيع جاهزة مع مفاتيح وألواح للحماية في المشاريع الكبيرة.", category_slug: "electrical-supplies", governorate: "Giza", price_per_unit: 11200, currency: "EGP", moq: 2, images: ["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200"] },
  { companyIdx: 9, title: "كابلات كهربائية متعددة النواة 3x25 مم", description: "كابلات تصنيع محلي مقاومة للتآكل ومناسبة للشبكات الصناعية.", category_slug: "electrical-supplies", governorate: "Alexandria", price_per_unit: 45, currency: "EGP", moq: 100, images: ["https://images.unsplash.com/photo-1549388604-817d15aa0110?w=1200"] },
  { companyIdx: 6, title: "بيارات ري ذكية مضادة للتسرب", description: "وحدة ري ذكية متكاملة قوية للمزارع الحديثة مع استشعار التربة.", category_slug: "agriculture-equipment", governorate: "Mansoura", price_per_unit: 18500, currency: "EGP", moq: 3, images: ["https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=1200"] },
  { companyIdx: 14, title: "جرار زراعي 85 حصان", description: "جرار حديث للاعمال الزراعية مع ناقل حركة أوتوماتيكي وخدمة محلية.", category_slug: "agriculture-equipment", governorate: "Mansoura", price_per_unit: 365000, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200"] },
  { companyIdx: 6, title: "خدمة صيانة محركات ري الحقول", description: "خدمة صيانة شاملة لمحركات الري والمضخات الزراعية مع قطع غيار أصلية.", category_slug: "agriculture-equipment", governorate: "Mansoura", price_per_unit: 4500, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1501006893679-8e97c7c8d1d8?w=1200"] },
  { companyIdx: 5, title: "مونة أسمنت عالية المقاومة 50 كجم", description: "أكياس أسمنت خاصة للبناء والتشطيب مع تحمل عالي للضغط.", category_slug: "construction-materials", governorate: "Suez", price_per_unit: 290, currency: "EGP", moq: 200, images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200"] },
  { companyIdx: 8, title: "بلاط أرضيات رخام صناعي 60x60", description: "بلاط رخام صناعي لمشاريع التجزئة والمجمعات السكنية.", category_slug: "construction-materials", governorate: "Cairo", price_per_unit: 220, currency: "EGP", moq: 150, images: ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200"] },
  { companyIdx: 13, title: "وحدات بناء جاهزة معيارية", description: "وحدات جاهزة للاستخدام السريع في المشاريع السكنية والمخازن.", category_slug: "construction-materials", governorate: "Suez", price_per_unit: 129000, currency: "EGP", moq: 2, images: ["https://images.unsplash.com/photo-1529429617124-3c17f2a394b8?w=1200"] },
  { companyIdx: 16, title: "عازل حراري دقيق للمباني", description: "مواد عزل حراري وصوتي معتمد للمباني الصناعية والتجارية.", category_slug: "construction-materials", governorate: "Cairo", price_per_unit: 82, currency: "EGP", moq: 250, images: ["https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200"] },
  { companyIdx: 5, title: "خلاط أسمنت كهربائي 240 لتر", description: "خلاط خرساني محمول مع محرك كهربائي قوي ومتانة عالية.", category_slug: "construction-materials", governorate: "Suez", price_per_unit: 12500, currency: "EGP", moq: 4, images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200"] },
  { companyIdx: 12, title: "آلة لحام صفيح ألومنيوم", description: "ماكينة لحام متطورة لقطع الألومنيوم والاستيل في خطوط الإنتاج.", category_slug: "industrial-machines", governorate: "Ismailia", price_per_unit: 39500, currency: "EGP", moq: 2, images: ["https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200"] },
  { companyIdx: 18, title: "ورشة تجميع وحدات معدنية", description: "خدمة تجميع وحدات صناعية ومشروعات تجهيز معادن ثقيلة.", category_slug: "industrial-machines", governorate: "Suez", price_per_unit: 24000, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1200"] },
  { companyIdx: 7, title: "ماكينة تقطيع الليزر 2.5 متر", description: "آلة ليزر صناعية لقطع الصفائح المعدنية بدقة عالية.", category_slug: "industrial-machines", governorate: "Tanta", price_per_unit: 158000, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1549366029-4c223e1b9b6f?w=1200"] },
  { companyIdx: 18, title: "خدمة صيانة خطوط الإنتاج", description: "دعم صيانة وقائية وخدمات إصلاح للمعدات الصناعية الثقيلة.", category_slug: "industrial-machines", governorate: "Suez", price_per_unit: 7500, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200"] },
  { companyIdx: 5, title: "صندوق كرتون بحجم 40x30x20 سم", description: "صناديق تغليف قوية للتصدير والتخزين مع طبقة داخلية مقاومة للرطوبة.", category_slug: "packaging", governorate: "Suez", price_per_unit: 6.5, currency: "EGP", moq: 500, images: ["https://images.unsplash.com/photo-1598032891051-25173065f6d1?w=1200"] },
  { companyIdx: 12, title: "مغلفات بلاستيك متعددة الطبقات", description: "أكياس تغليف مقاومة للضوء والرطوبة للمنتجات الغذائية.", category_slug: "packaging", governorate: "Ismailia", price_per_unit: 2.8, currency: "EGP", moq: 2000, images: ["https://images.unsplash.com/photo-1585386959984-a4155222c7c7?w=1200"] },
  { companyIdx: 4, title: "شرائط تغليف أمان للشحن", description: "شرائط لاصقة متينة خاصة بالتغليف الصناعي والشحن البحري.", category_slug: "packaging", governorate: "Ismailia", price_per_unit: 4.2, currency: "EGP", moq: 1000, images: ["https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1200"] },
  { companyIdx: 3, title: "خدمة توصيل سلسلة باردة", description: "خدمة لوجستيات بشاحنات مبردة لتوزيع المواد الغذائية والمنظفات.", category_slug: "logistics", governorate: "Port Said", price_per_unit: 1250, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1542223616-46bf7438e4ef?w=1200"] },
  { companyIdx: 15, title: "استئجار مخزن تبريد 500 متر مربع", description: "مساحة تخزين مبردة مع خدمات مناولة وشحن يومية.", category_slug: "logistics", governorate: "Tanta", price_per_unit: 95000, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1483721310020-03333e577078?w=1200"] },
  { companyIdx: 5, title: "شحن برية إلى القاهرة والمنطقة الاقتصادية", description: "شحن شاحنات كاملة مع تتبع GPS وخدمة تحميل وتفريغ.", category_slug: "logistics", governorate: "Suez", price_per_unit: 8500, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1519415943484-8b08fe7b9b30?w=1200"] },
  { companyIdx: 4, title: "خدمة تعبئة وتسليم منتجة", description: "تغليف وتسليم سريع للسلع الاستهلاكية والمعدات الصناعية.", category_slug: "packaging", governorate: "Ismailia", price_per_unit: 2200, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1504893524553-b85538d8b4c8?w=1200"] },
  { companyIdx: 17, title: "برنامج مراقبة كاميرات عن بعد", description: "خدمة مراقبة وتشغيل كاميرات عبر الإنترنت مع تقرير أمني شهري.", category_slug: "cctv-cameras", governorate: "Alexandria", price_per_unit: 8200, currency: "EGP", moq: 1, images: ["https://images.unsplash.com/photo-1526050355605-3b287d0fa7b7?w=1200"] },
  { companyIdx: 14, title: "عدادات ري ذكية وقياس رطوبة التربة", description: "حل تحكم ري ذكي متصل بتقنية إنترنت الأشياء للمزارع.", category_slug: "agriculture-equipment", governorate: "Mansoura", price_per_unit: 12800, currency: "EGP", moq: 3, images: ["https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200"] },
];

const DEMO_FACTORY_DETAILS = [
  { companyIdx: 0, certifications: ["ISO 9001", "CE"], employees_range: "120-180", export_available: true, production_capacity: "5,500 CCTV units/month", verified: true },
  { companyIdx: 1, certifications: ["ISO 14001", "OHSAS 18001"], employees_range: "220-260", export_available: true, production_capacity: "8,000 solar panels/month", verified: true },
  { companyIdx: 2, certifications: ["ISO 27001"], employees_range: "40-60", export_available: false, production_capacity: "120 software projects/year", verified: true },
  { companyIdx: 3, certifications: ["ISO 9001"], employees_range: "50-70", export_available: true, production_capacity: "12,000 logistics shipments/month", verified: true },
  { companyIdx: 4, certifications: ["FSSC 22000"], employees_range: "35-55", export_available: true, production_capacity: "250,000 packaging units/week", verified: true },
  { companyIdx: 5, certifications: ["CE", "ISO 9001"], employees_range: "90-110", export_available: true, production_capacity: "18,000 tons of building material/month", verified: true },
  { companyIdx: 6, certifications: ["CE"], employees_range: "75-95", export_available: true, production_capacity: "250 farm machines/month", verified: true },
  { companyIdx: 7, certifications: ["ISO 9001", "CE"], employees_range: "60-80", export_available: true, production_capacity: "80 industrial machines/month", verified: true },
  { companyIdx: 8, certifications: ["ISO 9001"], employees_range: "100-130", export_available: true, production_capacity: "14,000 tons of cement products/month", verified: true },
  { companyIdx: 9, certifications: ["CE", "TUV"], employees_range: "55-75", export_available: true, production_capacity: "6,000 solar kits/month", verified: true },
  { companyIdx: 10, certifications: ["ISO 9001"], employees_range: "80-100", export_available: true, production_capacity: "25,000 electrical units/month", verified: true },
  { companyIdx: 11, certifications: ["FSSC 22000"], employees_range: "45-65", export_available: true, production_capacity: "320,000 packaging bags/month", verified: true },
  { companyIdx: 12, certifications: ["ISO 9001"], employees_range: "90-115", export_available: true, production_capacity: "45 industrial assemblies/month", verified: true },
  { companyIdx: 13, certifications: ["CE"], employees_range: "70-95", export_available: true, production_capacity: "5,500 solar units/month", verified: true },
  { companyIdx: 14, certifications: ["CE"], employees_range: "60-84", export_available: true, production_capacity: "210 agricultural machines/month", verified: true },
  { companyIdx: 15, certifications: ["ISO 9001"], employees_range: "40-60", export_available: true, production_capacity: "120 logistics orders/day", verified: true },
  { companyIdx: 16, certifications: ["CE"], employees_range: "80-110", export_available: true, production_capacity: "4,200 CCTV accessories/month", verified: true },
  { companyIdx: 17, certifications: ["ISO 9001"], employees_range: "95-125", export_available: true, production_capacity: "90 heavy machines/month", verified: true },
  { companyIdx: 18, certifications: ["CE"], employees_range: "70-90", export_available: true, production_capacity: "14 modular production lines/month", verified: true },
  { companyIdx: 19, certifications: ["ISO 9001", "CE"], employees_range: "100-140", export_available: true, production_capacity: "10 fabrication projects/month", verified: true },
];

const DEMO_RFQS = [
  { buyerIdx: 0, title: "طلب عرض سعر لنظام كاميرات مراقبة متكامل", description: "نبحث عن نظام كاميرات مراقبة داخلي وخارجي مع أجهزة تسجيل وتخزين سحابي.", category_slug: "cctv-cameras", governorate: "Cairo", quantity: 12, unit: "set", budget_min: 180000, budget_max: 220000, currency: "EGP", status: "open" },
  { buyerIdx: 1, title: "طلب عرض لمشروع تركيب ألواح شمسية على سقف مصنع", description: "تحتاج منشأتنا إلى نظام 50 كيلووات ببطاريات تخزين للطاقة.", category_slug: "solar-panels", governorate: "Giza", quantity: 50, unit: "panel", budget_min: 260000, budget_max: 310000, currency: "EGP", status: "open" },
  { buyerIdx: 2, title: "طلب توريد كابلات كهربائية ثنائية الطبقة", description: "نحتاج 1,200 متر كابلات معزولة للمشروع الصناعي داخل الإسكندرية.", category_slug: "electrical-supplies", governorate: "Alexandria", quantity: 1200, unit: "meter", budget_min: 44000, budget_max: 52000, currency: "EGP", status: "open" },
  { buyerIdx: 3, title: "طلب توريد عبوات تغليف غذائية", description: "نبحث عن عبوات بلاستيكية ومغلفات مضادة للرطوبة لحملة تصدير.", category_slug: "packaging", governorate: "Port Said", quantity: 42000, unit: "piece", budget_min: 63000, budget_max: 77000, currency: "EGP", status: "open" },
  { buyerIdx: 4, title: "طلب أسعار لعربات تسليم لوجستية", description: "نحتاج خدمات توزيع ونقل سريعة عبر خط قناة السويس والمحافظات المجاورة.", category_slug: "logistics", governorate: "Ismailia", quantity: 1, unit: "service", budget_min: 32000, budget_max: 42000, currency: "EGP", status: "open" },
  { buyerIdx: 5, title: "طلب توريد حديد تسليح للسقف", description: "حاجة إلى 180 طن حديد تسليح لمشروع إداري في السويس.", category_slug: "construction-materials", governorate: "Suez", quantity: 180, unit: "ton", budget_min: 1200000, budget_max: 1380000, currency: "EGP", status: "open" },
  { buyerIdx: 6, title: "طلب آليات ري ذكية لمزرعة قصب", description: "مطلوب نظام ري ذكي لمزرعة بمساحة 80 فدان في المنصورة.", category_slug: "agriculture-equipment", governorate: "Mansoura", quantity: 10, unit: "unit", budget_min: 160000, budget_max: 220000, currency: "EGP", status: "open" },
  { buyerIdx: 7, title: "طلب توريد ماكينة قطع الليزر", description: "نحتاج ماكينة قطع ليزر 2.5 متر لخط إنتاج جديد بالمصنع.", category_slug: "industrial-machines", governorate: "Tanta", quantity: 1, unit: "machine", budget_min: 140000, budget_max: 175000, currency: "EGP", status: "open" },
  { buyerIdx: 8, title: "طلب مواد عزل حراري وصوتي", description: "مطلوب 500 متر مربع من المواد العازلة لمركز تجاري جديد بالقاهرة.", category_slug: "construction-materials", governorate: "Cairo", quantity: 500, unit: "sq.m", budget_min: 40000, budget_max: 52000, currency: "EGP", status: "open" },
  { buyerIdx: 9, title: "طلب حلول إضاءة للطاقة الشمسية", description: "خدمة تصميم وتركيب إنارة شمسية لورشة فضاء مفتوح في الإسكندرية.", category_slug: "solar-panels", governorate: "Alexandria", quantity: 24, unit: "set", budget_min: 190000, budget_max: 230000, currency: "EGP", status: "open" },
  { buyerIdx: 10, title: "طلب توريد مفاتيح توزيع كهربائية", description: "نحتاج 12 لوحة توزيع وتحكم جاهزة لمشروع عقاري في الجيزة.", category_slug: "electrical-supplies", governorate: "Giza", quantity: 12, unit: "unit", budget_min: 130000, budget_max: 165000, currency: "EGP", status: "open" },
  { buyerIdx: 11, title: "طلب عبوات شحن للتصدير البحري", description: "نبحث عن أكياس وشرائط تعبئة تتوافق مع معايير التصدير.", category_slug: "packaging", governorate: "Port Said", quantity: 65000, unit: "piece", budget_min: 95000, budget_max: 115000, currency: "EGP", status: "open" },
  { buyerIdx: 12, title: "طلب خط إنتاج لحام مزدوج", description: "مطلوب خط إنتاج كامل لوحدة حام للألمنيوم في مصنع منطقة القناة.", category_slug: "industrial-machines", governorate: "Ismailia", quantity: 1, unit: "line", budget_min: 320000, budget_max: 390000, currency: "EGP", status: "open" },
  { buyerIdx: 13, title: "طلب توريد مجموعة ألواح شمسية لشركة نفطية", description: "مطلوب توريد وتركيب مجموعة وحدات شمسية سليكونية عالية الكفاءة.", category_slug: "solar-panels", governorate: "Suez", quantity: 68, unit: "panel", budget_min: 560000, budget_max: 640000, currency: "EGP", status: "open" },
  { buyerIdx: 14, title: "طلب توريد معدات زراعية للبيوت المحمية", description: "نبحث عن مضخات ومعدات رش آلية لمشروع زراعي في المنصورة.", category_slug: "agriculture-equipment", governorate: "Mansoura", quantity: 6, unit: "set", budget_min: 98000, budget_max: 120000, currency: "EGP", status: "open" },
];

const DEMO_TENDERS = [
  { publisherIdx: 5, title: "مناقصة توريد خرسانة جاهزة للمشروع البحري", description: "توريد 750 متر مكعب خرسانة جاهزة بمواصفات مقاومة الملح لمشروع رصيف بحري.", category_slug: "construction-materials", governorate: "Suez", budget: 1650000, currency: "EGP", deadline: "2026-10-15", status: "open" },
  { publisherIdx: 0, title: "مناقصة تأسيس نظام كاميرات مراقبة صناعي", description: "تصميم وتركيب نظام مراقبة متكامل في ثلاثة مواقع صناعية بالقاهرة.", category_slug: "cctv-cameras", governorate: "Cairo", budget: 760000, currency: "EGP", deadline: "2026-09-30", status: "open" },
  { publisherIdx: 6, title: "مناقصة توفير مضخات ري متطورة وجهاز تحكم ذكي", description: "توريد وتركيب نظام ري ذكي لمزرعة مساحتها 120 فدان.", category_slug: "agriculture-equipment", governorate: "Mansoura", budget: 310000, currency: "EGP", deadline: "2026-10-01", status: "open" },
  { publisherIdx: 3, title: "مناقصة شحن وتخزين وتفريغ بضائع تصديرية", description: "خدمات لوجستية متكاملة لعدة حاويات عبر ميناء بورسعيد.", category_slug: "logistics", governorate: "Port Said", budget: 420000, currency: "EGP", deadline: "2026-09-20", status: "open" },
  { publisherIdx: 8, title: "مناقصة تركيب ألواح شمسية لمحطة مياه", description: "توريد وتركيب نظام طاقة شمسية لدعم محطة مياه حكومية.", category_slug: "solar-panels", governorate: "Cairo", budget: 860000, currency: "EGP", deadline: "2026-10-10", status: "open" },
  { publisherIdx: 10, title: "مناقصة توريد لوحات توزيع كهربائية لمشروع تجاري", description: "توريد 20 لوحة توزيع جاهزة مع لوحات حماية ومفاتيح ذكية.", category_slug: "electrical-supplies", governorate: "Giza", budget: 315000, currency: "EGP", deadline: "2026-09-25", status: "open" },
  { publisherIdx: 4, title: "مناقصة تغليف وتعبئة منتجات غذائية للتصدير", description: "توريد حلول تغليف صديقة للبيئة وتوريد مواد تغليف لمصنع غذائي.", category_slug: "packaging", governorate: "Ismailia", budget: 195000, currency: "EGP", deadline: "2026-10-05", status: "open" },
  { publisherIdx: 2, title: "مناقصة تطوير منصة تجارة إلكترونية لموردين صناعيين", description: "تصميم واجهة وتجربة مستخدم لمنصة رقمية لشراء المكونات الصناعية.", category_slug: "services", governorate: "Giza", budget: 450000, currency: "EGP", deadline: "2026-11-01", status: "open" },
  { publisherIdx: 7, title: "مناقصة توفير آلة قطع بالليزر وورش صيانة", description: "توريد آلة قطع ليزر مستخدمة وخدمات تركيب وتشغيل.", category_slug: "industrial-machines", governorate: "Tanta", budget: 198000, currency: "EGP", deadline: "2026-10-12", status: "open" },
  { publisherIdx: 11, title: "مناقصة تصميم منتج عبوات بلاستيكية للعلامة التجارية", description: "تصميم وإنتاج عبوات بلاستيكية مخصصة لمنتج جديد.", category_slug: "packaging", governorate: "Port Said", budget: 96000, currency: "EGP", deadline: "2026-10-20", status: "open" },
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

    await supabaseAdmin.from("business_categories").upsert(DEMO_BUSINESS_CATEGORIES, { onConflict: "slug" });

    let factoryCount = 0;
    for (const details of DEMO_FACTORY_DETAILS) {
      const cid = companyIds[details.companyIdx];
      const { data: existingFactory } = await supabaseAdmin.from("factories").select("company_id").eq("company_id", cid).maybeSingle();
      if (existingFactory) {
        await supabaseAdmin.from("factories").update({
          certifications: details.certifications,
          employees_range: details.employees_range,
          export_available: details.export_available,
          production_capacity: details.production_capacity,
          verified: details.verified,
        }).eq("company_id", cid);
      } else {
        const { error } = await supabaseAdmin.from("factories").insert({
          company_id: cid,
          certifications: details.certifications,
          employees_range: details.employees_range,
          export_available: details.export_available,
          production_capacity: details.production_capacity,
          verified: details.verified,
        });
        if (error) throw new Error(error.message);
        factoryCount += 1;
      }
    }

    let wholesaleCount = 0;
    for (const item of DEMO_WHOLESALE_LISTINGS) {
      const cid = companyIds[item.companyIdx];
      const { data: dup } = await supabaseAdmin.from("wholesale_listings").select("id").eq("company_id", cid).eq("title", item.title).maybeSingle();
      if (dup) continue;
      const { error } = await supabaseAdmin.from("wholesale_listings").insert({
        company_id: cid,
        title: item.title,
        description: item.description,
        category_slug: item.category_slug,
        governorate: item.governorate,
        price_per_unit: item.price_per_unit,
        currency: item.currency,
        moq: item.moq,
        images: item.images,
        active: true,
      });
      if (error) throw new Error(error.message);
      wholesaleCount += 1;
    }

    let rfqCount = 0;
    for (const request of DEMO_RFQS) {
      const buyerId = companyIds[request.buyerIdx];
      const { data: dup } = await supabaseAdmin.from("rfqs").select("id").eq("buyer_id", buyerId).eq("title", request.title).maybeSingle();
      if (dup) continue;
      const { error } = await supabaseAdmin.from("rfqs").insert({
        buyer_id: buyerId,
        title: request.title,
        description: request.description,
        category_slug: request.category_slug,
        governorate: request.governorate,
        quantity: request.quantity,
        unit: request.unit,
        budget_min: request.budget_min,
        budget_max: request.budget_max,
        currency: request.currency,
        status: request.status,
        attachments: [],
      });
      if (error) throw new Error(error.message);
      rfqCount += 1;
    }

    let tenderCount = 0;
    for (const item of DEMO_TENDERS) {
      const publisherId = companyIds[item.publisherIdx];
      const { data: dup } = await supabaseAdmin.from("tenders").select("id").eq("publisher_id", publisherId).eq("title", item.title).maybeSingle();
      if (dup) continue;
      const { error } = await supabaseAdmin.from("tenders").insert({
        publisher_id: publisherId,
        title: item.title,
        description: item.description,
        category_slug: item.category_slug,
        governorate: item.governorate,
        budget: item.budget,
        currency: item.currency,
        deadline: item.deadline,
        status: item.status,
      });
      if (error) throw new Error(error.message);
      tenderCount += 1;
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

    return {
      ok: true,
      companies: companyIds.length,
      agents: DEMO_AGENTS.length,
      listings: DEMO_LISTINGS.length,
      factories: factoryCount,
      wholesale_listings: wholesaleCount,
      rfqs: rfqCount,
      tenders: tenderCount,
    };
  });
