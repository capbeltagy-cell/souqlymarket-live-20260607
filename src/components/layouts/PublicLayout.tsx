import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

type PublicLayoutProps = {
  children: ReactNode;
  announcement?: ReactNode;
};

/** The only public-facing shell for Souqly 2.0 pages. */
export function PublicLayout({ children, announcement }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {announcement}
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
