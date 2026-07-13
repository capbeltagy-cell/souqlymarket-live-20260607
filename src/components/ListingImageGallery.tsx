import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  images: string[];
  alt: string;
};

/**
 * Listing image gallery: swipe on mobile, arrow keys / buttons on desktop,
 * counter, thumbnails, and fullscreen zoom. Uses Embla (already installed).
 */
export function ListingImageGallery({ images, alt }: Props) {
  const { dir, locale } = useI18n();
  const ar = locale === "ar";
  // De-dupe while preserving order; keep first image as main.
  const uniq = Array.from(new Set(images.filter(Boolean)));
  const [emblaRef, embla] = useEmblaCarousel({ loop: uniq.length > 1, direction: dir === "rtl" ? "rtl" : "ltr" });
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIdx(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => { embla.off("select", onSelect); };
  }, [embla]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") embla?.scrollPrev();
      if (e.key === "ArrowRight") embla?.scrollNext();
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, embla]);

  if (uniq.length === 0) {
    return (
      <div className="w-full aspect-video bg-muted grid place-items-center text-muted-foreground rounded-xl border border-border">
        {ar ? "لا توجد صور" : "No image"}
      </div>
    );
  }

  const scrollTo = (i: number) => embla?.scrollTo(i);

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border border-border bg-card group">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {uniq.map((u, i) => (
              <div key={u + i} className="min-w-0 flex-[0_0_100%]">
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="block w-full aspect-video bg-muted"
                  aria-label={ar ? "تكبير الصورة" : "Expand image"}
                >
                  <img src={u} alt={alt} className="w-full h-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {uniq.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              aria-label={ar ? "السابق" : "Previous"}
              className="hidden md:grid absolute start-2 top-1/2 -translate-y-1/2 h-9 w-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition"
            >
              {dir === "rtl" ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              aria-label={ar ? "التالي" : "Next"}
              className="hidden md:grid absolute end-2 top-1/2 -translate-y-1/2 h-9 w-9 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition"
            >
              {dir === "rtl" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
            <div className="absolute bottom-2 end-2 rounded-full bg-black/60 text-white text-xs px-2 py-1 tabular-nums">
              {idx + 1} / {uniq.length}
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={ar ? "تكبير" : "Expand"}
          className="absolute top-2 end-2 grid place-items-center h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>

      {uniq.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {uniq.map((u, i) => (
            <button
              key={u + "t" + i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`${ar ? "صورة" : "Image"} ${i + 1}`}
              className={`h-16 w-16 flex-shrink-0 rounded border overflow-hidden transition ${i === idx ? "border-primary ring-2 ring-primary/40" : "border-border opacity-70 hover:opacity-100"}`}
            >
              <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black border-0 overflow-hidden">
          <div className="relative">
            <img src={uniq[idx]} alt={alt} className="w-full max-h-[85vh] object-contain bg-black" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={ar ? "إغلاق" : "Close"}
              className="absolute top-3 end-3 grid place-items-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-5 w-5" />
            </button>
            {uniq.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => embla?.scrollPrev()}
                  aria-label={ar ? "السابق" : "Previous"}
                  className="absolute start-3 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  {dir === "rtl" ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
                </button>
                <button
                  type="button"
                  onClick={() => embla?.scrollNext()}
                  aria-label={ar ? "التالي" : "Next"}
                  className="absolute end-3 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  {dir === "rtl" ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 text-white text-sm px-3 py-1 tabular-nums">
                  {idx + 1} / {uniq.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
