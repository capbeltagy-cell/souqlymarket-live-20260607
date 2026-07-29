import CompanyApplicationActions from "@/components/admin/CompanyApplicationActions";
import { requireAdminPage } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const admin = await requireAdminPage();

  const [applications, usersCount, companiesCount] = await Promise.all([
    prisma.companyApplication.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        submittedAt: "asc",
      },
    }),
    prisma.user.count(),
    prisma.company.count(),
  ]);

  return (
    <main className="page">
      <div className="container">
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">إدارة سوقلي</span>
            <h1>أهلًا {admin.fullName}</h1>
            <p>راجع الشركات وتحكم في نمو المنصة من مكان واحد.</p>
          </div>
        </div>

        <section className="stats-grid">
          <article className="stat-card">
            <strong>{usersCount}</strong>
            <span>المستخدمون</span>
          </article>

          <article className="stat-card">
            <strong>{companiesCount}</strong>
            <span>الشركات المعتمدة</span>
          </article>

          <article className="stat-card">
            <strong>{applications.length}</strong>
            <span>طلبات تنتظر المراجعة</span>
          </article>
        </section>

        <section className="section">
          <h2>طلبات اعتماد الشركات</h2>

          {applications.length === 0 ? (
            <div className="card">
              <p>لا توجد طلبات شركات قيد المراجعة حاليًا.</p>
            </div>
          ) : (
            <div className="applications-list">
              {applications.map((application) => (
                <article className="card" key={application.id}>
                  <span className="card-label">طلب شركة جديد</span>
                  <h3>{application.companyName}</h3>

                  <div className="details-grid">
                    <p>
                      <strong>صاحب الطلب:</strong>{" "}
                      {application.user.fullName}
                    </p>
                    <p>
                      <strong>البريد:</strong> {application.user.email}
                    </p>
                    <p>
                      <strong>الهاتف:</strong>{" "}
                      {application.user.phone || "غير مضاف"}
                    </p>
                    <p>
                      <strong>الاسم القانوني:</strong>{" "}
                      {application.legalName || "غير مضاف"}
                    </p>
                    <p>
                      <strong>السجل التجاري:</strong>{" "}
                      {application.commercialReg || "غير مضاف"}
                    </p>
                    <p>
                      <strong>الرقم الضريبي:</strong>{" "}
                      {application.taxNumber || "غير مضاف"}
                    </p>
                  </div>

                  <CompanyApplicationActions
                    applicationId={application.id}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
