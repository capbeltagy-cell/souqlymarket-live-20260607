import Link from "next/link";

export default function Page() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Link href="/" className="text-amber-300 font-bold">← العودة للرئيسية</Link>

        <h1 className="mt-8 text-4xl md:text-6xl font-black capitalize">
          distributors
        </h1>

        <p className="mt-5 max-w-3xl text-lg text-slate-300">
          هذا القسم جزء من شبكة Souqly للأعمال، وسيتم ربطه ببيانات الشركات
          والفرص وطلبات التعاون داخل لوحة التحكم.
        </p>

        <div className="mt-10 flex gap-3 flex-wrap">
          <Link href="/register" className="rounded-2xl bg-amber-400 px-7 py-4 font-bold text-slate-950">
            انضم الآن
          </Link>
          <Link href="/opportunities" className="rounded-2xl border border-white/15 px-7 py-4 font-bold">
            تصفح الفرص
          </Link>
        </div>
      </div>
    </main>
  );
}
