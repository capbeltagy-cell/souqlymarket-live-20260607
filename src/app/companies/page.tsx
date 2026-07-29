import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    where: {
      isVerified: true,
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="page">
      <div className="container">
        <span className="eyebrow">شبكة سوقلي</span>
        <h1>دليل الشركات المعتمدة</h1>
        <p className="page-description">
          لا تظهر هنا إلا الشركات التي راجعتها ووافقت عليها إدارة سوقلي.
        </p>

        {companies.length === 0 ? (
          <div className="card empty-directory">
            <h3>لم تتم إضافة شركات بعد</h3>
            <p>ستظهر الشركات هنا فور اعتماد أول طلب.</p>
          </div>
        ) : (
          <div className="grid companies-grid">
            {companies.map((company) => (
              <Link
                href={`/companies/${company.slug}`}
                className="card company-card"
                key={company.id}
              >
                <div className="company-card-head">
                  <div className="company-logo-small">
                    {company.name.slice(0, 1)}
                  </div>

                  <div>
                    <h3>{company.name}</h3>
                    <span className="verified-badge">معتمدة</span>
                  </div>
                </div>

                <p>
                  {company.description ||
                    "ملف الشركة قيد الاستكمال."}
                </p>

                <small>{company._count.members} أعضاء بالفريق</small>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
