import { CalendarDays, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TRIAL_DAYS = 7;
export const STORE_MONTHLY_PRICE_EGP = 250;

type Props = {
  createdAt?: string | null;
};

export function StoreSubscriptionCard({ createdAt }: Props) {
  const created = createdAt ? new Date(createdAt) : null;
  const trialEnd =
    created && !Number.isNaN(created.getTime())
      ? new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
      : null;
  const remainingMs = trialEnd ? trialEnd.getTime() - Date.now() : 0;
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const inTrial = Boolean(trialEnd && remainingMs > 0);

  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-l from-primary/10 via-card to-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            {inTrial ? <CalendarDays className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">اشتراك المتجر</h2>
              <Badge variant={inTrial ? "secondary" : "outline"}>
                {inTrial
                  ? `تجربة مجانية — ${remainingDays} ${remainingDays === 1 ? "يوم" : "أيام"}`
                  : "بانتظار التفعيل"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              7 أيام مجانية، ثم {STORE_MONTHLY_PRICE_EGP.toLocaleString("ar-EG")} جنيه شهريًا. لن
              يتم تحصيل أي مبلغ تلقائيًا.
            </p>
            {trialEnd && (
              <p className="mt-1 text-xs text-muted-foreground">
                {inTrial ? "تنتهي الفترة المجانية" : "انتهت الفترة المجانية"}:{" "}
                {trialEnd.toLocaleDateString("ar-EG")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
