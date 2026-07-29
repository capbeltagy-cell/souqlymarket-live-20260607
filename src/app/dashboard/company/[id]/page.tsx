import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CompanyWorkspacePage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const membership = await prisma.companyMember.findUnique({
    where: {
      companyId_userId: {
        companyId: id,
        userId: user.id,
      },
    },
    include: {
      company: true,
    },
  });

  if (!membership) {
    notFound();
  }

  const modules = [
    ["العملاء CRM", "إدارة العملاء والمتابعات والصفقات"],
    ["الموردون", "إدارة الموردين وبيانات التواصل"],
    ["المنتجات", "إدارة المنتجات والخدمات"],
    ["المخزون", "متابعة الأرصدة والحركات"],
    ["عروض الأسعار", "إنشاء ومتابعة عروض الأسعار"],
    ["المبيعات", "طلبات البيع والفواتير"],
    ["المشتريات", "طلبات الشراء والتوريد"],
    ["المشروعات", "المشروعات والمهام والفريق"],
    ["الفرص", "نشر ومتابعة فرص الأعمال"],
  ];

  return (
    <main className="page">
      <div className="container">
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">مساحة عمل الشركة</span>
            <h1>{membership.company.name}</h1>
            <p>دورك داخل الشركة: {membership.role}</p>
          </div>

          <div className="dashboard-quick-actions">
            {["OWNER", "ADMIN", "MANAGER"].includes(membership.role) && (
              <Link className="button" href={`/dashboard/company/${id}/settings`}>
                تعديل ملف الشركة
              </Link>
            )}
            <Link className="button secondary" href={`/companies/${membership.company.slug}`}>
              عرض الصفحة العامة
            </Link>
          </div>
        </div>

        <section className="grid">
          {modules.map(([title, text]) => (
            <article className="card" key={title}>
              <span className="card-label">Souqly Business OS</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="module-state">قريبًا داخل النسخة الأساسية</span>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
