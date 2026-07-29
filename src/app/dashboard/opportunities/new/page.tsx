import { redirect } from "next/navigation";
import CreateOpportunityForm from "@/components/opportunities/CreateOpportunityForm";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function NewOpportunityPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const memberships = await prisma.companyMember.findMany({
    where: {
      userId: user.id,
      role: {
        in: ["OWNER", "ADMIN", "MANAGER"],
      },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return (
    <main className="page">
      <div className="container">
        <CreateOpportunityForm
          companies={memberships.map((item) => item.company)}
        />
      </div>
    </main>
  );
}
