import type { ReactNode } from "react";
import { BarChart3, Boxes, Building2, Package, Settings, ShoppingCart, Users } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PublicLayout } from "./PublicLayout";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

const companyItems = [
  { label: "لوحة الشركة", href: "/company-center", icon: BarChart3 },
  { label: "المتجر", href: "/store", icon: Building2 },
  { label: "المنتجات", href: "/store/products/new", icon: Package },
  { label: "الطلبات", href: "/orders", icon: ShoppingCart },
  { label: "المخزون", href: "/business-suite", icon: Boxes },
  { label: "الفريق والعملاء", href: "/company", icon: Users },
  { label: "الإعدادات", href: "/company-profile-extra", icon: Settings },
] satisfies Parameters<typeof WorkspaceSidebar>[0]["items"];

export function CompanyWorkspaceLayout({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <PublicLayout>
      <div className="container-souqly py-6 lg:py-10">
        <Breadcrumbs
          items={[{ label: "مساحة الشركة", href: "/company-center" }, { label: title }]}
        />
        <div className="mt-5 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <WorkspaceSidebar label="مساحة الشركة" items={companyItems} />
          <section className="min-w-0">
            <h1 className="mb-6 text-3xl font-bold">{title}</h1>
            {children}
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
