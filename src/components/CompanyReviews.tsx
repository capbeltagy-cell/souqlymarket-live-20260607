import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_id: string;
  created_at: string;
};

export function CompanyReviews({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);

  const load = async () => {
    const { data } = await (supabase.from("reviews" as never) as any)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    const arr = (data ?? []) as Review[];
    setItems(arr);
    if (user) setMyReview(arr.find((r) => r.reviewer_id === user.id) ?? null);
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [companyId, user?.id]);

  const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : 0;

  const submit = async () => {
    if (!user) {
      toast.error("سجّل الدخول أولاً");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        company_id: companyId,
        reviewer_id: user.id,
        rating,
        comment: comment.trim() || null,
      };
      const { error } = await (supabase.from("reviews" as never) as any).upsert(payload, {
        onConflict: "company_id,reviewer_id",
      });
      if (error) throw error;
      toast.success("تم حفظ تقييمك");
      setComment("");
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">التقييمات ({items.length})</h2>
        {items.length > 0 && (
          <div className="flex items-center gap-1 text-primary font-semibold">
            <Star className="h-4 w-4 fill-primary" />
            {avg.toFixed(1)}
          </div>
        )}
      </div>

      {user && (
        <div className="space-y-2 border-b border-border pb-4">
          <div className="text-sm font-medium">{myReview ? "تعديل تقييمك" : "اكتب تقييمك"}</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star
                  className={`h-6 w-6 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="شارك تجربتك مع هذه الشركة (اختياري)"
            rows={3}
          />
          <Button onClick={submit} disabled={submitting} size="sm">
            حفظ التقييم
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">لا توجد تقييمات بعد</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="border-b border-border pb-3 last:border-0">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                  />
                ))}
                <span className="text-xs text-muted-foreground ms-2">
                  {new Date(r.created_at).toLocaleDateString("ar-EG")}
                </span>
              </div>
              {r.comment && (
                <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
