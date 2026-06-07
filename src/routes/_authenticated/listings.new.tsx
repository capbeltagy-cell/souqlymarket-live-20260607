import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlusCircle, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import type { ListingType } from "@/lib/sampleData";
import { getMyPlan } from "@/lib/billing.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/listings/new")({
  head: () => ({ meta: [{ title: "New Listing — Souqly" }] }),
  component: NewListing,
});

const TYPES: ListingType[] = ["product", "service", "real_estate", "land", "factory", "opportunity"];

function NewListing() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fetchPlan = useServerFn(getMyPlan);
  const [planInfo, setPlanInfo] = useState<{ plan: string; maxListings: number; currentListings: number } | null>(null);

  const [type, setType] = useState<ListingType>("product");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      toast.success(t("listing_published"));
      setSubmitting(false);
      navigate({ to: "/dashboard" });
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <PlusCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("new_listing_title")}</h1>
          </div>
          <form onSubmit={onSubmit} className="rounded-lg border border-border bg-card p-6 shadow-card space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("field_type")}</Label>
                <Select value={type} onValueChange={(v) => setType(v as ListingType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((tp) => (
                      <SelectItem key={tp} value={tp}>{t(`cat_${tp}` as never)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("field_country")}</Label>
                <Input required placeholder="Saudi Arabia" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("field_title")}</Label>
              <Input required maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label>{t("field_description")}</Label>
              <Textarea required rows={5} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("field_price")}</Label>
                <Input required type="number" min={0} />
              </div>
              <div className="space-y-2">
                <Label>{t("field_commission")}</Label>
                <Input required type="number" min={0} max={100} step="0.1" defaultValue={5} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("field_image")}</Label>
              <Input type="url" placeholder="https://..." />
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary-hover">
                {t("submit_listing")}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
