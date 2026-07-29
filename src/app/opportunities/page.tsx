import Link from "next/link";
import { prisma } from "@/lib/prisma";

const typeLabels = {
  PURCHASE_REQUEST: "طلب شراء",
  TENDER: "مناقصة",
  DISTRIBUTOR: "وكالة أو توزيع",
  SUPPLIER: "مطلوب مورد",
  PARTNERSHIP: "شراكة",
  IMPORT: "استيراد",
  EXPORT: "تصدير",
  INVESTMENT: "استثمار",
  SERVICE: "خدمة أعمال",
};

function formatMoney(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default async function OpportunitiesPage() {
  const opportunities = await prisma.opportunity.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
    },
    include: {
      creator: {
        select: {
          fullName: true,
        },
      },
      company: {
        select: {
          name: true,
          slug: true,
          isVerified: true,
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
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">فرص أعمال يومية</span>
            <h1>مركز الفرص</h1>
            <p>
              طلبات شراء ومناقصات ووكلاء وموردون وفرص تعاون بين الشركات.
            </p>
          </div>

          <Link href="/dashboard/opportunities/new" className="button">
            نشر فرصة جديدة
          </Link>
        </div>

        {opportunities.length === 0 ? (
          <div className="card empty-directory">
            <h3>لا توجد فرص منشورة حتى الآن</h3>
            <p>كن أول من ينشر فرصة أعمال على سوقلي.</p>
          </div>
        ) : (
          <div className="opportunities-list">
            {opportunities.map((opportunity) => {
              const minimum = formatMoney(opportunity.budgetMin);
              const maximum = formatMoney(opportunity.budgetMax);

              return (
                <article className="card opportunity-card" key={opportunity.id}>
                  <div className="opportunity-head">
                    <span className="opportunity-type">
                      {typeLabels[opportunity.type]}
                    </span>

                    <span className="opportunity-date">
                      {new Intl.DateTimeFormat("ar-EG").format(
                        opportunity.createdAt
                      )}
                    </span>
                  </div>

                  <h2>{opportunity.title}</h2>

                  <p className="opportunity-description">
                    {opportunity.description}
                  </p>

                  <div className="opportunity-meta">
                    <span>
                      الناشر: {opportunity.company
                        ? opportunity.company.name
                        : opportunity.creator.fullName}
                    </span>

                    {opportunity.company?.isVerified && (
                      <span className="verified-badge">شركة معتمدة</span>
                    )}

                    {opportunity.sector && (
                      <span>القطاع: {opportunity.sector}</span>
                    )}

                    {opportunity.city && (
                      <span>الموقع: {opportunity.city}</span>
                    )}

                    {(minimum || maximum) && (
                      <span>
                        الميزانية: {minimum && maximum
                          ? `${minimum} – ${maximum} جنيه`
                          : `${minimum || maximum} جنيه`}
                      </span>
                    )}

                    {opportunity.deadline && (
                      <span>
                        آخر موعد: {new Intl.DateTimeFormat("ar-EG").format(
                          opportunity.deadline
                        )}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
