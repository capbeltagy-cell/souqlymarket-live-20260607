import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { submitLead } from "@/lib/phase2.functions";
import { supabase } from "@/integrations/supabase/client";

export function LeadForm({ listingId }: { listingId: string }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const send = useServerFn(submitLead);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let referral_code: string | undefined;
      try {
        referral_code = localStorage.getItem("souqly.ref") || undefined;
      } catch {
        /* noop */
      }
      await send({
        data: {
          listingId,
          buyer_name: name,
          buyer_email: email,
          buyer_phone: phone,
          message,
          referral_code,
        },
      });
      // also count click for engagement
      await supabase.rpc("increment_listing_click", { _id: listingId });
      setDone(true);
      toast.success(
        ar
          ? "تم إرسال طلبك. ستتواصل معك الشركة قريباً."
          : "Request sent. The company will contact you shortly.",
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/5 p-5 text-sm">
        <div className="font-semibold text-success mb-1">
          {ar ? "تم استلام طلبك ✓" : "Request received ✓"}
        </div>
        <p className="text-muted-foreground">
          {ar
            ? "سيتم التواصل معك من قبل الشركة في أقرب وقت ممكن."
            : "The company will get back to you as soon as possible."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3"
    >
      <div>
        <h3 className="font-semibold">
          {ar ? "طلب معلومات / عرض سعر" : "Request information / quote"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {ar
            ? "اترك بياناتك وستتواصل معك الشركة مباشرةً."
            : "Leave your details and the company will reach out directly."}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-name">{ar ? "الاسم" : "Name"} *</Label>
        <Input
          id="lead-name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          dir={ar ? "rtl" : "ltr"}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-email">{ar ? "البريد" : "Email"}</Label>
          <Input
            id="lead-email"
            type="email"
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-phone">{ar ? "الهاتف" : "Phone"}</Label>
          <Input
            id="lead-phone"
            type="tel"
            maxLength={40}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-msg">{ar ? "الرسالة" : "Message"}</Label>
        <Textarea
          id="lead-msg"
          rows={3}
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          dir={ar ? "rtl" : "ltr"}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {ar
          ? "يجب توفير البريد أو الهاتف على الأقل."
          : "Please provide at least an email or phone."}
      </p>
      <Button
        type="submit"
        disabled={busy}
        className="w-full bg-primary hover:bg-primary-hover gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {ar ? "إرسال الطلب" : "Send request"}
      </Button>
    </form>
  );
}
