import { lazy, Suspense, useEffect, useState } from "react";
import type { ComponentProps } from "react";
import type { MapView as MapViewComponent } from "./MapView";

type MapViewProps = ComponentProps<typeof MapViewComponent>;

const LazyMapView = lazy(() => import("./MapView").then((module) => ({ default: module.MapView })));

export function ClientMapView(props: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`h-96 animate-pulse rounded-xl border border-border bg-muted ${props.className ?? ""}`}
        aria-label="جاري تحميل الخريطة"
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div
          className={`h-96 animate-pulse rounded-xl border border-border bg-muted ${props.className ?? ""}`}
          aria-label="جاري تحميل الخريطة"
        />
      }
    >
      <LazyMapView {...props} />
    </Suspense>
  );
}
