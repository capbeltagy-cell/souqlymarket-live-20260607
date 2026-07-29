import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function createSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const application = await prisma.companyApplication.findUnique({
    where: { id },
  });

  if (!application) {
    return NextResponse.json(
      { error: "الطلب غير موجود" },
      { status: 404 }
    );
  }

  if (application.status !== "PENDING") {
    return NextResponse.json(
      { error: "الطلب تمت مراجعته بالفعل" },
      { status: 409 }
    );
  }

  const baseSlug = createSlug(application.companyName) || "company";
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        ownerId: application.userId,
        name: application.companyName,
        slug,
        isVerified: true,
      },
    });

    await tx.companyMember.create({
      data: {
        companyId: company.id,
        userId: application.userId,
        role: "OWNER",
      },
    });

    const updatedApplication = await tx.companyApplication.update({
      where: { id: application.id },
      data: {
        companyId: company.id,
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });

    return {
      company,
      application: updatedApplication,
    };
  });

  return NextResponse.json(result);
}
