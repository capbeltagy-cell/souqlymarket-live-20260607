import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicCompanyPage({ params }: Props) {
  const { slug } = await params;

  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      owner: {
        select: {
          fullName: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  return (
    <main className="page">
      <div className="container">
        <section className="company-hero card">
          <div className="company-logo-placeholder">
            {company.name.slice(0, 1)}
          </div>

          <div>
            <div className="company-title-row">
              <h1>{company.name}</h1>
              {company.isVerified && (
                <span className="verified-badge">شركة معتمدة</span>
              )}
            </div>

            <p>
              {company.description ||
                "لم تضف الشركة وصفًا لنشاطها بعد."}
            </p>

            <div className="company-meta">
              <span>المالك: {company.owner.fullName}</span>
              <span>أعضاء الفريق: {company._count.members}</span>
              <span>
                انضمت في{" "}
                {new Intl.DateTimeFormat("ar-EG").format(company.createdAt)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
