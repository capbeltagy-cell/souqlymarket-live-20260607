import { Menu, Clock, ShieldCheck } from "lucide-react";

interface AdminTopbarProps {
  onMenuClick: () => void;
}

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const now = new Date().toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="فتح قائمة الإدارة"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">مركز إدارة سوقلي</p>
              <p className="truncate text-xs text-muted-foreground">منطقة خاصة بالمشرفين فقط</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground sm:flex">
          <Clock className="h-4 w-4" />
          <span>{now}</span>
        </div>
      </div>
    </header>
  );
}
