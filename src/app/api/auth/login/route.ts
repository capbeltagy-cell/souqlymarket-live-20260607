import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "البريد أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(
      body.password,
      user.passwordHash
    );

    if (!valid) {
      return NextResponse.json(
        { error: "البريد أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "تعذر تسجيل الدخول" },
      { status: 400 }
    );
  }
}
