import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth/admin";

export default async function AdminPage() {
  await requireAdminPage();

  const applications = await prisma.companyApplication.findMany({
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
  });

  return (
    <main className="page">
      <div className="container">
        <span className="eyebrow">إدارة سوقلي</span>
        <h1>طلبات اعتماد الشركات</h1>

        {applications.length === 0 ? (
          <div className="card">
            <p>لا توجد طلبات شركات قيد المراجعة حاليًا.</p>
          </div>
        ) : (
          <div className="applications-list">
            {applications.map((application) => (
              <article className="card" key={application.id}>
                <h3>{application.companyName}</h3>
                <p>صاحب الطلب: {application.user.fullName}</p>
                <p>البريد: {application.user.email}</p>
                <p>الهاتف: {application.user.phone || "غير مضاف"}</p>
                <p>السجل التجاري: {application.commercialReg || "غير مضاف"}</p>
                <p>الرقم الضريبي: {application.taxNumber || "غير مضاف"}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
