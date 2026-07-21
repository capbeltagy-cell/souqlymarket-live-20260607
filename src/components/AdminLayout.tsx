import { type ReactNode, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import { Breadcrumbs } from "./Breadcrumbs";

export interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  loading?: boolean;
  error?: string | null;
}

export function AdminLayout({
  children,
  title,
  description,
  breadcrumbs,
  loading = false,
  error = null,
}: AdminLayoutProps) {
  const { locale, setLocale } = useI18n();
  const { roles } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (locale !== "ar") setLocale("ar");
  }, [locale, setLocale]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">الوصول غير مسموح</h1>
          <p className="text-sm text-muted-foreground">هذا القسم متاح لمسؤولي المنصة فقط.</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-surface-2 text-foreground">
      <AdminSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      <div className="lg:ps-64">
        <AdminTopbar onMenuClick={() => setSidebarOpen((open) => !open)} />

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-5">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          )}

          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
          )}

          {loading && (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
              <div className="text-center">
                <div className="inline-flex h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <p className="mt-3 text-sm text-muted-foreground">جاري التحميل...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-destructive/25 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          {!loading && children}
        </main>
      </div>
    </div>
  );
}
