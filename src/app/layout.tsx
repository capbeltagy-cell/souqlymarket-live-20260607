import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "سوقلي ماركت",
  description: "نظام تشغيل وشبكة أعمال للشركات",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="header">
          <nav className="container nav">
            <Link href="/" className="brand">
              سوقلي ماركت
            </Link>

            <div className="links">
              <Link href="/companies">الشركات</Link>
              <Link href="/opportunities">الفرص</Link>
              <Link href="/dashboard">مساحة العمل</Link>
            </div>

            <Link href="/login" className="button">
              تسجيل الدخول
            </Link>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
