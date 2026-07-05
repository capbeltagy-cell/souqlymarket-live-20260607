import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, Upload, X, GripVertical, Star } from "lucide-react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type UploadedImage = { url: string; source: "uploaded" | "live_capture" };

type Props = {
  bucket?: string;
  folder?: string;
  value: UploadedImage[];
  onChange: (imgs: UploadedImage[]) => void;
  max?: number;
  className?: string;
};

const COMPRESS_OPTS = { maxSizeMB: 1.2, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/jpeg" as const };

export function ImageUploader({ bucket = "listing-media", folder = "listings", value, onChange, max = 10, className }: Props) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const dragIdx = useRef<number | null>(null);

  const uploadOne = useCallback(async (file: File, source: "uploaded" | "live_capture"): Promise<UploadedImage | null> => {
    if (!user) { toast.error(locale === "ar" ? "سجّل الدخول أولاً" : "Sign in first"); return null; }
    const tempId = `${file.name}-${Date.now()}-${Math.random()}`;
    try {
      setProgress((p) => ({ ...p, [tempId]: 5 }));
      const isImage = file.type.startsWith("image/");
      const toUpload = isImage ? await imageCompression(file, COMPRESS_OPTS) : file;
      setProgress((p) => ({ ...p, [tempId]: 40 }));
      const ext = isImage ? "jpg" : (file.name.split(".").pop() ?? "bin");
      const path = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, toUpload, { contentType: toUpload.type, cacheControl: "31536000" });
      if (error) throw error;
      setProgress((p) => ({ ...p, [tempId]: 80 }));
      const { data, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data?.signedUrl) throw sErr ?? new Error("Sign URL failed");
      setProgress((p) => { const { [tempId]: _, ...rest } = p; return rest; });
      return { url: data.signedUrl, source };
    } catch (e) {
      setProgress((p) => { const { [tempId]: _, ...rest } = p; return rest; });
      toast.error((e as Error).message);
      return null;
    }
  }, [bucket, folder, user, locale]);

  const handleFiles = useCallback(async (files: FileList | File[], source: "uploaded" | "live_capture" = "uploaded") => {
    const arr = Array.from(files).slice(0, max - value.length);
    if (arr.length === 0) return;
    const uploaded: UploadedImage[] = [];
    for (const f of arr) {
      const res = await uploadOne(f, source);
      if (res) uploaded.push(res);
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
  }, [max, value, onChange, uploadOne]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files, "uploaded");
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= value.length) return;
    const next = value.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  const progressEntries = Object.entries(progress);
  const uploading = progressEntries.length > 0;
  const canAddMore = value.length < max;

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-4 transition ${dragOver ? "border-primary bg-primary/5" : "border-input"}`}
      >
        {value.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-3">
            {value.map((img, i) => (
              <div
                key={img.url + i}
                draggable
                onDragStart={() => { dragIdx.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragIdx.current !== null) move(dragIdx.current, i); dragIdx.current = null; }}
                className="relative group aspect-square rounded-md overflow-hidden border border-border bg-muted"
              >
                <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 start-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5" />{locale === "ar" ? "رئيسية" : "Main"}
                  </span>
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-black/40 flex items-center justify-center gap-1">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className="text-white text-xs px-1.5 py-0.5 rounded bg-white/20 disabled:opacity-40">‹</button>
                  <GripVertical className="h-4 w-4 text-white cursor-grab" />
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} className="text-white text-xs px-1.5 py-0.5 rounded bg-white/20 disabled:opacity-40">›</button>
                </div>
                <button type="button" onClick={() => remove(i)} className="absolute -top-1 -end-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {progressEntries.length > 0 && (
          <div className="space-y-1 mb-3">
            {progressEntries.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="text-muted-foreground truncate flex-1">{k.split("-")[0]}</span>
                <Progress value={v} className="h-1.5 w-24" />
              </div>
            ))}
          </div>
        )}
        {canAddMore && (
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary-hover">
              <Upload className="h-4 w-4" />
              {locale === "ar" ? "رفع صور" : "Upload"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files, "uploaded")} />
            </label>
            <label className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-success text-success-foreground text-sm font-medium cursor-pointer hover:opacity-90">
              <Camera className="h-4 w-4" />
              {locale === "ar" ? "كاميرا" : "Camera"}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files, "live_capture")} />
            </label>
            <div className="flex items-center text-xs text-muted-foreground">
              {locale === "ar" ? `أو اسحب الصور هنا • ${value.length}/${max}` : `or drag & drop • ${value.length}/${max}`}
            </div>
          </div>
        )}
        {!canAddMore && (
          <div className="text-xs text-muted-foreground text-center">
            {locale === "ar" ? `الحد الأقصى ${max} صور` : `Max ${max} images`}
          </div>
        )}
      </div>
      {uploading && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          {locale === "ar" ? "جاري ضغط ورفع الصور…" : "Compressing & uploading…"}
        </div>
      )}
    </div>
  );
}

// Backwards-compat helper for pages that still use the old string[]+source[] shape
export function toLegacyShape(imgs: UploadedImage[]): { images: string[]; image_sources: ("uploaded" | "live_capture")[] } {
  return { images: imgs.map((i) => i.url), image_sources: imgs.map((i) => i.source) };
}
export function fromLegacyShape(images: string[] = [], sources: ("uploaded" | "live_capture")[] = []): UploadedImage[] {
  return images.map((url, i) => ({ url, source: sources[i] ?? "uploaded" }));
}
