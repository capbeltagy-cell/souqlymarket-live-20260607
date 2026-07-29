export default function DashboardPage() {
  return (
    <main className="page">
      <div className="container">
        <h1>مساحة العمل</h1>

        <div className="grid">
          <article className="card">
            <h3>ملف الشركة</h3>
            <p>أنشئ ملف شركتك وأرسله للمراجعة.</p>
          </article>

          <article className="card">
            <h3>الفرص المناسبة</h3>
            <p>ستظهر هنا الفرص المطابقة لنشاطك.</p>
          </article>

          <article className="card">
            <h3>مهام اليوم</h3>
            <p>تابع العملاء وعروض الأسعار والمهام اليومية.</p>
          </article>
        </div>
      </div>
    </main>
  );
}
