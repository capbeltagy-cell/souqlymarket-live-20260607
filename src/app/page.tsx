import Link from "next/link";

const hubs = [
  { title: "الفرص التجارية", href: "/opportunities", desc: "فرص توريد، توزيع، شراكة واستثمار." },
  { title: "طلبات الشراء", href: "/rfqs", desc: "طلبات شراء وتوريد من شركات جادة." },
  { title: "المستثمرون", href: "/investors", desc: "اربط شركتك بمستثمرين مهتمين بقطاعك." },
  { title: "الموردون والمصانع", href: "/suppliers", desc: "اكتشف موردين ومصانع وشركاء إنتاج." },
  { title: "الوكلاء والموزعون", href: "/distributors", desc: "ابحث عن موزعين ووكلاء في أسواق جديدة." },
  { title: "الخدمات الاحترافية", href: "/services", desc: "خدمات قانونية، مالية، تسويقية وتشغيلية." },
];

export default function HomePage() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-black">Souqly</Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <Link href="/companies">الشركات</Link>
            <Link href="/opportunities">الفرص</Link>
            <Link href="/investors">المستثمرون</Link>
            <Link href="/suppliers">الموردون</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-xl border border-white/15 px-4 py-2">
              تسجيل الدخول
            </Link>
            <Link
              href="/store-builder"
              className="rounded-xl bg-amber-400 px-4 py-2 font-bold text-slate-950"
            >
              أنشئ موقع شركتك مجانًا
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-amber-300">
            شبكة الأعمال العربية الجديدة
          </span>

          <h1 className="mx-auto mt-7 max-w-5xl text-4xl md:text-7xl font-black leading-tight">
            اربط شركتك بالموردين والتجار والمستثمرين والفرص
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-300">
            منصة واحدة لاكتشاف الشركات، فرص التوريد، الشراكات، الاستثمار،
            الاستيراد والتصدير، وإنشاء واجهة رقمية احترافية لشركتك مجانًا.
          </p>

          <form action="/companies" className="mx-auto mt-10 flex max-w-3xl flex-col md:flex-row gap-3">
            <input
              name="q"
              placeholder="ابحث عن شركة، مصنع، مورد، مستثمر أو فرصة..."
              className="h-14 flex-1 rounded-2xl border border-white/10 bg-white/10 px-5 outline-none"
            />
            <button className="h-14 rounded-2xl bg-amber-400 px-8 font-bold text-slate-950">
              ابحث الآن
            </button>
          </form>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-2xl bg-white px-7 py-4 font-bold text-slate-950">
              انضم إلى شبكة الأعمال
            </Link>
            <Link href="/store-builder" className="rounded-2xl border border-white/15 px-7 py-4 font-bold">
              أنشئ موقع شركتك مجانًا
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4 gap-6 px-6 py-10 text-center">
          {[
            ["+1,000", "شركة مستهدفة"],
            ["+500", "فرصة أعمال"],
            ["+20", "قطاع اقتصادي"],
            ["24/7", "وصول للفرص"],
          ].map(([value, label]) => (
            <div key={label}>
              <div className="text-3xl font-black text-amber-300">{value}</div>
              <div className="mt-2 text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="text-amber-300 font-bold">مركز الأعمال</span>
          <h2 className="mt-3 text-3xl md:text-5xl font-black">كل ما تحتاجه شركتك للنمو</h2>
          <p className="mt-4 text-slate-400">
            اكتشف فرصًا جديدة وابنِ علاقات تجارية حقيقية داخل منظومة واحدة.
          </p>
        </div>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hubs.map((hub) => (
            <Link
              key={hub.href}
              href={hub.href}
              className="group rounded-3xl border border-white/10 bg-white/[0.04] p-7 hover:border-amber-400/40 hover:bg-white/[0.07] transition"
            >
              <h3 className="text-xl font-bold group-hover:text-amber-300">{hub.title}</h3>
              <p className="mt-3 text-slate-400 leading-7">{hub.desc}</p>
              <div className="mt-7 font-bold text-amber-300">استكشف القسم ←</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-[2rem] bg-amber-400 p-8 md:p-14 text-slate-950 md:flex items-center justify-between gap-8">
          <div>
            <span className="font-bold">Souqly Company Builder</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-black">
              أنشئ موقع شركتك مجانًا الآن
            </h2>
            <p className="mt-4 max-w-2xl text-slate-800">
              اعرض شركتك، منتجاتك، خدماتك، كتالوجاتك، فروعك ووسائل التواصل،
              واستقبل طلبات عروض الأسعار والشراكات من مكان واحد.
            </p>
          </div>

          <Link
            href="/store-builder"
            className="mt-7 md:mt-0 inline-flex rounded-2xl bg-slate-950 px-7 py-4 font-bold text-white"
          >
            ابدأ الإنشاء مجانًا
          </Link>
        </div>
      </section>
    </main>
  );
}
