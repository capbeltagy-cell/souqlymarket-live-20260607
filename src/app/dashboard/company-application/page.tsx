import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import CompanyApplicationForm from "@/components/company/CompanyApplicationForm";

const statusLabels = {
  DRAFT: "مسودة",
  PENDING: "قيد المراجعة",
  CHANGES_REQUESTED: "مطلوب تعديلات",
  APPROVED: "تمت الموافقة",
  REJECTED: "مرفوض",
};

export default async function CompanyApplicationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const application = await prisma.companyApplication.findFirst({
    where: { userId: user.id },
    include: { company: true },
    orderBy: { createdAt: "desc" },
  });

  if (!application) {
    return (
      <main className="page">
        <div className="container">
          <CompanyApplicationForm />
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="card status-card">
          <span className="eyebrow">حالة الطلب</span>
          <h1>{statusLabels[application.status]}</h1>
          <p>الشركة: {application.companyName}</p>

          {application.adminNotes && (
            <div className="notice">
              <strong>ملاحظات الإدارة:</strong>
              <p>{application.adminNotes}</p>
            </div>
          )}

          {application.company && (
            <a
              href={`/dashboard/company/${application.company.id}`}
              className="button"
            >
              دخول مساحة عمل الشركة
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
