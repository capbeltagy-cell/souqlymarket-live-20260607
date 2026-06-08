import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageCircle, Handshake } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "تواصل معنا — سوقلي" }] }),
  component: Page,
});

const schema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(100),
  email: z.string().trim().email("بريد غير صحيح").max(255),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(10, "الرسالة قصيرة").max(2000),
});

function Page() {
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"), email: fd.get("email"),
      subject: fd.get("subject"), message: fd.get("message"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const body = encodeURIComponent(
      `الاسم: ${parsed.data.name}\nالبريد: ${parsed.data.email}\n\n${parsed.data.message}`
    );
    window.location.href = `mailto:support@souqlymarket.com?subject=${encodeURIComponent(parsed.data.subject)}&body=${body}`;
    setTimeout(() => { toast.success("تم فتح بريدك لإرسال الرسالة"); setBusy(false); }, 600);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container-souqly py-12 flex-1 max-w-5xl">
        <h1 className="text-3xl font-bold mb-2 text-right">تواصل معنا</h1>
        <p className="text-muted-foreground mb-8 text-right">فريق سوقلي مستعد للرد على استفساراتك خلال 24 ساعة.</p>
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <a href="mailto:support@souqlymarket.com" className="rounded-lg border border-border bg-card p-5 hover:border-primary transition text-right">
            <Mail className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold">الدعم الفني</div>
            <div className="text-sm text-muted-foreground">support@souqlymarket.com</div>
          </a>
          <a href="mailto:support@souqlymarket.com?subject=Partnership" className="rounded-lg border border-border bg-card p-5 hover:border-primary transition text-right">
            <Handshake className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold">الشراكات</div>
            <div className="text-sm text-muted-foreground">للاستفسار عن فرص الشراكة</div>
          </a>
          <div className="rounded-lg border border-border bg-card p-5 text-right">
            <MessageCircle className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold">واتساب</div>
            <div className="text-sm text-muted-foreground">قريباً</div>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-lg border border-border bg-card p-6 space-y-4 text-right">
          <h2 className="text-xl font-semibold mb-2">نموذج الدعم</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>الاسم</Label><Input name="name" required maxLength={100} /></div>
            <div><Label>البريد الإلكتروني</Label><Input name="email" type="email" required maxLength={255} /></div>
          </div>
          <div><Label>الموضوع</Label><Input name="subject" required maxLength={150} /></div>
          <div><Label>الرسالة</Label><Textarea name="message" required rows={6} maxLength={2000} /></div>
          <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary-hover">
            {busy ? "جارٍ الإرسال..." : "إرسال"}
          </Button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
