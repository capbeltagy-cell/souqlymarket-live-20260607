import { useState } from "react";
import {
  Copy,
  Share2,
  MessageCircle,
  Send,
  Linkedin,
  Facebook,
  Twitter,
  Instagram,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/I18nProvider";

export type ShareMenuProps = {
  url: string; // absolute or relative — will be normalized to absolute
  caption: string; // ready-made post text (without URL)
  title?: string; // optional short title, used for native share
  variant?: "button" | "compact";
  earning?: boolean; // marketer-referral link → show earning hint
  triggerLabel?: string;
  className?: string;
};

function abs(url: string) {
  if (typeof window === "undefined") return url;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

export function ShareMenu({
  url,
  caption,
  title,
  variant = "button",
  earning,
  triggerLabel,
  className,
}: ShareMenuProps) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const shareUrl = abs(url);
  const fullText = `${caption}\n\n${shareUrl}`.trim();
  const enc = (s: string) => encodeURIComponent(s);

  const links = {
    whatsapp: `https://wa.me/?text=${enc(fullText)}`,
    telegram: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(caption)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(caption)}`,
    twitter: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(caption)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
  };

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error(ar ? "تعذر النسخ" : "Copy failed");
    }
  };

  const native = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: title ?? "Souqly", text: caption, url: shareUrl });
      } catch {
        /* user canceled */
      }
    } else {
      copy(fullText, ar ? "تم نسخ النص والرابط" : "Text and link copied");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant === "compact" ? "ghost" : "outline"}
          size={variant === "compact" ? "sm" : "default"}
          className={`gap-2 ${className ?? ""}`}
        >
          <Share2 className="h-4 w-4" />
          {triggerLabel ?? (ar ? "مشاركة" : "Share")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir={ar ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{ar ? "مشاركة" : "Share"}</DialogTitle>
          <DialogDescription>
            {earning
              ? ar
                ? "شارك برابطك واربح عند حدوث تحويل مؤهل."
                : "Share your link and earn on qualified conversions."
              : ar
                ? "شارك هذا الإعلان"
                : "Share this item"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 h-9 rounded-md border border-input bg-muted px-3 text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => copy(shareUrl, ar ? "تم نسخ الرابط" : "Link copied")}
            >
              <Link2 className="h-3.5 w-3.5" />
              {ar ? "نسخ الرابط" : "Copy link"}
            </Button>
          </div>

          <Textarea readOnly value={caption} rows={5} className="text-sm resize-none" />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => copy(caption, ar ? "تم نسخ النص" : "Caption copied")}
            >
              <Copy className="h-3.5 w-3.5" />
              {ar ? "نسخ النص" : "Copy caption"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => copy(fullText, ar ? "تم نسخ النص والرابط" : "Text + link copied")}
            >
              <Copy className="h-3.5 w-3.5" />
              {ar ? "نسخ النص + الرابط" : "Copy text + link"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={native}>
              <Share2 className="h-3.5 w-3.5" />
              {ar ? "مشاركة النظام" : "System share"}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            <SocialBtn
              href={links.whatsapp}
              icon={MessageCircle}
              label="WhatsApp"
              color="text-[#25D366]"
            />
            <SocialBtn href={links.telegram} icon={Send} label="Telegram" color="text-[#229ED9]" />
            <SocialBtn
              href={links.facebook}
              icon={Facebook}
              label="Facebook"
              color="text-[#1877F2]"
            />
            <SocialBtn
              href={links.twitter}
              icon={Twitter}
              label="X / Twitter"
              color="text-foreground"
            />
            <SocialBtn
              href={links.linkedin}
              icon={Linkedin}
              label="LinkedIn"
              color="text-[#0A66C2]"
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1 justify-start"
              onClick={() =>
                copy(
                  fullText,
                  ar ? "انسخ ثم انشره على إنستجرام أو تيك توك" : "Paste on Instagram / TikTok",
                )
              }
            >
              <Instagram className="h-4 w-4 text-[#E4405F]" />
              IG / TikTok
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {ar
              ? "إنستجرام وتيك توك لا يدعمان مشاركة نص جاهز مباشرة — انسخ النص والرابط وانشرهما هناك."
              : "Instagram / TikTok don't support prefilled web shares — copy the caption and link, then paste there."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SocialBtn({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: typeof MessageCircle;
  label: string;
  color: string;
}) {
  return (
    <Button asChild size="sm" variant="outline" className="gap-1 justify-start">
      <a href={href} target="_blank" rel="noreferrer">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="truncate">{label}</span>
      </a>
    </Button>
  );
}
