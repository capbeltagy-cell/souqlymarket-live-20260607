import { AlertTriangle, LoaderCircle, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

type CollectionStateProps = {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  retryLabel: string;
  onRetry: () => void;
};

export function CollectionState({
  loading,
  error,
  empty,
  emptyTitle,
  emptyDescription,
  retryLabel,
  onRetry,
}: CollectionStateProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-2xl border bg-muted/40" />
        ))}
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
      >
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
        <p className="font-semibold">{error}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
          <LoaderCircle className="me-2 h-4 w-4" />
          {retryLabel}
        </Button>
      </div>
    );
  }

  if (empty) {
    return (
      <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center">
        <PackageOpen className="mx-auto mb-3 h-9 w-9 text-primary" />
        <h2 className="font-semibold">{emptyTitle}</h2>
        {emptyDescription && (
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{emptyDescription}</p>
        )}
      </div>
    );
  }

  return null;
}
