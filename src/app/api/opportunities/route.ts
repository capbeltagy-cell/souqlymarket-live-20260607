import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const opportunitySchema = z.object({
  title: z.string().trim().min(5).max(180),
  description: z.string().trim().min(20).max(5000),
  type: z.enum([
    "PURCHASE_REQUEST",
    "TENDER",
    "DISTRIBUTOR",
    "SUPPLIER",
    "PARTNERSHIP",
    "IMPORT",
    "EXPORT",
    "INVESTMENT",
    "SERVICE",
  ]),
  companyId: z.string().trim().optional().nullable(),
  sector: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  budgetMin: z.coerce.number().nonnegative().optional().nullable(),
  budgetMax: z.coerce.number().nonnegative().optional().nullable(),
  deadline: z.string().trim().optional().nullable(),
});

export async function GET() {
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
    take: 100,
  });

  return NextResponse.json({ opportunities });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول أولًا" },
      { status: 401 }
    );
  }

  try {
    const body = opportunitySchema.parse(await request.json());

    if (
      body.budgetMin !== null &&
      body.budgetMin !== undefined &&
      body.budgetMax !== null &&
      body.budgetMax !== undefined &&
      body.budgetMax < body.budgetMin
    ) {
      return NextResponse.json(
        { error: "الحد الأقصى للميزانية أقل من الحد الأدنى" },
        { status: 400 }
      );
    }

    let companyId: string | null = null;

    if (body.companyId) {
      const membership = await prisma.companyMember.findUnique({
        where: {
          companyId_userId: {
            companyId: body.companyId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "ليس لديك صلاحية النشر باسم هذه الشركة" },
          { status: 403 }
        );
      }

      companyId = body.companyId;
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        creatorId: user.id,
        companyId,
        title: body.title,
        description: body.description,
        type: body.type,
        sector: body.sector || null,
        city: body.city || null,
        budgetMin: body.budgetMin ?? null,
        budgetMax: body.budgetMax ?? null,
        deadline: body.deadline
          ? new Date(`${body.deadline}T23:59:59.999Z`)
          : null,
        status: "PUBLISHED",
      },
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "بيانات الفرصة غير صحيحة" },
      { status: 400 }
    );
  }
}
