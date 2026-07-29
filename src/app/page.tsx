import Link from "next/link";

const services = [
  {
    title: "شغّل شركتك",
    text: "إدارة العملاء والموردين والمخزون وعروض الأسعار والمهام من مكان واحد.",
  },
  {
    title: "ابحث عن فرص",
    text: "طلبات شراء ومناقصات ووكلاء وموردون وفرص تعاون يومية.",
  },
  {
    title: "ابنِ سمعتك",
    text: "ملف شركة موثق يوضح نشاطك وخبرتك واستجابتك وتعاملاتك.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1>شغّل شركتك واكتشف فرصتك التالية.</h1>
          <p>
            سوقلي ماركت هو نظام تشغيل وشبكة أعمال للشركات المصرية. حساب واحد،
            ملف شركة موثق، أدوات إدارة كاملة، وفرص أعمال حقيقية.
          </p>

          <div className="actions">
            <Link href="/register" className="button">
              ابدأ مجانًا
            </Link>
            <Link href="/opportunities" className="button secondary">
              تصفح الفرص
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid">
          {services.map((service) => (
            <article className="card" key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
