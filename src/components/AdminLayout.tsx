import { ReactNode, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { Breadcrumbs } from "./Breadcrumbs";

export interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  loading?: boolean;
  error?: string | null;
}

export function AdminLayout({
  children,
  title,
  breadcrumbs,
  loading = false,
  error = null,
}: AdminLayoutProps) {
  const { locale } = useI18n();
  const { roles } = useAuth();
  const ar = locale === "ar";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = roles.includes("admin");

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {ar ? "محظور" : "Access Denied"}
          </h1>
          <p className="text-gray-600">
            {ar ? "أنت لا تملك صلاحيات الوصول" : "You don't have access"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      <div className="lg:ps-64">
        <AdminTopbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="p-6 lg:p-8">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-6">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          )}

          {title && <h1 className="text-3xl font-bold text-gray-900 mb-6">{title}</h1>}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                <p className="mt-2 text-sm text-gray-600">
                  {ar ? "جاري التحميل..." : "Loading..."}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!loading && children}
        </main>
      </div>
    </div>
  );
}
