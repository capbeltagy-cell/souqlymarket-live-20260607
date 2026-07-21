import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const { locale } = useI18n();
  const ar = locale === "ar";

  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600">
      <Link to="/admin-overview" className="hover:text-gray-900 transition-colors">
        {ar ? "الرئيسية" : "Home"}
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link to={item.href as any} className="hover:text-gray-900 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
