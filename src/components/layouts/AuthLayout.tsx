import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BriefcaseBusiness } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  description: string;
};

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(22rem,0.8fr)_1.2fr]">
      <aside className="hero-gradient hidden flex-col justify-between p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-3 text-xl font-bold">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <BriefcaseBusiness className="h-5 w-5" />
          </span>
          Souqly
        </Link>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight">{title}</h1>
          <p className="mt-4 text-primary-foreground/75">{description}</p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} Souqly</p>
      </aside>
      <main className="flex min-w-0 flex-col p-6 sm:p-10 lg:p-12">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="font-bold text-primary lg:hidden">
            Souqly
          </Link>
          <LanguageToggle />
        </div>
        <div className="grid flex-1 place-items-center py-8">{children}</div>
      </main>
    </div>
  );
}
