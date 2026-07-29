import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const schema = z.object({
  companyName: z.string().min(2).max(150),
  legalName: z.string().max(180).optional().or(z.literal("")),
  taxNumber: z.string().max(100).optional().or(z.literal("")),
  commercialReg: z.string().max(100).optional().or(z.literal("")),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const application = await prisma.companyApplication.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ application });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const body = schema.parse(await request.json());

    const pendingApplication = await prisma.companyApplication.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ["PENDING", "APPROVED"],
        },
      },
    });

    if (pendingApplication) {
      return NextResponse.json(
        { error: "لديك طلب قائم بالفعل" },
        { status: 409 }
      );
    }

    const application = await prisma.companyApplication.create({
      data: {
        userId: user.id,
        companyName: body.companyName.trim(),
        legalName: body.legalName?.trim() || null,
        taxNumber: body.taxNumber?.trim() || null,
        commercialReg: body.commercialReg?.trim() || null,
        status: "PENDING",
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "بيانات الطلب غير صحيحة" },
      { status: 400 }
    );
  }
}
