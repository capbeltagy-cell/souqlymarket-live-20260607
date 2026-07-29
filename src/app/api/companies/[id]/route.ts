import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const schema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  sector: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  website: z.string().trim().url().optional().or(z.literal("")),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  logoUrl: z.string().trim().url().optional().or(z.literal("")),
  coverUrl: z.string().trim().url().optional().or(z.literal("")),
  catalogUrl: z.string().trim().url().optional().or(z.literal("")),
  establishedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  employeeCount: z.coerce.number().int().min(0).max(1000000).optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }

  const { id } = await context.params;

  const membership = await prisma.companyMember.findUnique({
    where: {
      companyId_userId: {
        companyId: id,
        userId: user.id,
      },
    },
  });

  if (!membership || !["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "ليس لديك صلاحية تعديل الشركة" }, { status: 403 });
  }

  try {
    const body = schema.parse(await request.json());

    const company = await prisma.company.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null,
        sector: body.sector || null,
        city: body.city || null,
        website: body.website || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        logoUrl: body.logoUrl || null,
        coverUrl: body.coverUrl || null,
        catalogUrl: body.catalogUrl || null,
        establishedYear: body.establishedYear ?? null,
        employeeCount: body.employeeCount ?? null,
      },
    });

    return NextResponse.json({ company });
  } catch {
    return NextResponse.json({ error: "بيانات الشركة غير صحيحة" }, { status: 400 });
  }
}
