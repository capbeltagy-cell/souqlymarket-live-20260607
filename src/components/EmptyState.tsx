import { Link } from "@tanstack/react-router";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
};

/**
 * Professional empty-state card used across marketplace/RFQ/tender/wholesale
 * /real-estate/lands. Arabic-first copy is passed by the caller.
 */
export function EmptyState({ icon, title, description, ctaLabel, ctaTo }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 grid place-items-center text-primary">
        {icon ?? <PackageOpen className="h-7 w-7" />}
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      )}
      {ctaLabel && ctaTo && (
        <Button asChild className="mt-5 bg-primary hover:bg-primary-hover">
          <Link to={ctaTo}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}
