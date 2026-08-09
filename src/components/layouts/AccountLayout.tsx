import type { ReactNode } from "react";
import { BarChart3, Heart, MessageSquare, Package, Settings, UserRound } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PublicLayout } from "./PublicLayout";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

const accountItems = [
  { label: "نظرة عامة", href: "/dashboard", icon: BarChart3 },
  { label: "الطلبات", href: "/orders", icon: Package },
  { label: "الرسائل", href: "/messages", icon: MessageSquare },
  { label: "المفضلة", href: "/favorites", icon: Heart },
  { label: "الملف الشخصي", href: "/profile", icon: UserRound },
  { label: "الإعدادات", href: "/profile", icon: Settings },
] satisfies Parameters<typeof WorkspaceSidebar>[0]["items"];

export function AccountLayout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <PublicLayout>
      <div className="container-souqly py-6 lg:py-10">
        <Breadcrumbs items={[{ label: "حسابي", href: "/dashboard" }, { label: title }]} />
        <div className="mt-5 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <WorkspaceSidebar label="حسابي" items={accountItems} />
          <section className="min-w-0">
            <h1 className="mb-6 text-3xl font-bold">{title}</h1>
            {children}
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
