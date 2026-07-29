import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function requireAdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return user;
}

export async function requireAdminApi() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "يجب تسجيل الدخول" },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return {
      user: null,
      response: NextResponse.json(
        { error: "ليس لديك صلاحية الإدارة" },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    response: null,
  };
}
