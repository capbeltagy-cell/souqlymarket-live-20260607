import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const schema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(100),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    const email = body.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدم بالفعل" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        fullName: body.fullName.trim(),
        email,
        phone: body.phone?.trim() || null,
        passwordHash: await hashPassword(body.password),
      },
    });

    await createSession(user.id);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "بيانات التسجيل غير صحيحة" },
      { status: 400 }
    );
  }
}
