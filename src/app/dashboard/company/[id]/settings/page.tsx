import { notFound, redirect } from "next/navigation";
import CompanyProfileForm from "@/components/company/CompanyProfileForm";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CompanySettingsPage({ params }: Props) {
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

  if (!membership || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
    notFound();
  }

  return (
    <main className="page">
      <div className="container">
        <CompanyProfileForm company={membership.company} />
      </div>
    </main>
  );
}
