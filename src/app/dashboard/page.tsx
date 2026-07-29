import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/dashboard/LogoutButton";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const [memberships, application] = await Promise.all([
    prisma.companyMember.findMany({
      where: {
        userId: user.id,
      },
      include: {
        company: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.companyApplication.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return (
    <main className="page">
      <div className="container">
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">مساحة العمل</span>
            <h1>أهلًا يا {user.fullName}</h1>
            <p>أدر شركاتك وفرصك التجارية من مكان واحد.</p>
          </div>

          <LogoutButton />
        </div>

        <section className="stats-grid">
          <article className="stat-card">
            <strong>{memberships.length}</strong>
            <span>الشركات المرتبطة بحسابك</span>
          </article>

          <article className="stat-card">
            <strong>0</strong>
            <span>فرص مناسبة</span>
          </article>

          <article className="stat-card">
            <strong>
              {application?.status || "لا يوجد"}
            </strong>
            <span>آخر طلب شركة</span>
          </article>
        </section>

        <section className="section compact-section">
          <h2>شركاتك</h2>

          {memberships.length === 0 ? (
            <article className="card">
              <span className="card-label">ابدأ من هنا</span>
              <h3>أنشئ ملف شركتك</h3>
              <p>
                أدخل بيانات الشركة، ثم أرسل الطلب لمراجعة الإدارة.
              </p>
              <Link
                href="/dashboard/company-application"
                className="text-link"
              >
                تقديم طلب شركة ←
              </Link>
            </article>
          ) : (
            <div className="grid">
              {memberships.map((membership) => (
                <Link
                  href={`/dashboard/company/${membership.company.id}`}
                  className="card company-card"
                  key={membership.id}
                >
                  <span className="card-label">
                    {membership.role}
                  </span>
                  <h3>{membership.company.name}</h3>
                  <p>دخول لوحة تشغيل الشركة وإدارة أدواتها.</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
