import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const application = await prisma.companyApplication.update({
    where: { id },
    data: {
      status: "REJECTED",
      adminNotes:
        typeof body.adminNotes === "string"
          ? body.adminNotes.trim()
          : "لم تتم الموافقة على الطلب",
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ application });
}
