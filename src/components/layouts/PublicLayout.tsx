import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

type PublicLayoutProps = {
  children: ReactNode;
  announcement?: ReactNode;
  mainClassName?: string;
};

/** The only public-facing shell for Souqly 2.0 pages. */
export function PublicLayout({ children, announcement, mainClassName = "" }: PublicLayoutProps) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed start-4 top-3 z-[100] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
      >
        تخطِ إلى المحتوى الرئيسي
      </a>
      {announcement ? <div role="status">{announcement}</div> : null}
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className={`public-main min-w-0 flex-1 outline-none ${mainClassName}`}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
