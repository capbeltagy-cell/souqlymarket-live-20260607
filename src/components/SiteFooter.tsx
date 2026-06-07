import { Briefcase } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-souqly py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-primary mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Briefcase className="h-4 w-4" />
            </div>
            {t("brand")}
          </div>
          <p className="text-sm text-muted-foreground">{t("footer_tagline")}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">{t("nav_marketplace")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{t("cat_product")}</li><li>{t("cat_service")}</li><li>{t("cat_real_estate")}</li><li>{t("cat_factory")}</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">{t("nav_companies")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{t("cta_join_company")}</li><li>{t("plan_premium_company")}</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">{t("nav_agents")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{t("cta_join_agent")}</li><li>{t("plan_premium_agent")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-souqly py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t("brand")} — {t("footer_rights")}
        </div>
      </div>
    </footer>
  );
}
