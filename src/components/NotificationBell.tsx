import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications" as never).select("*").order("created_at", { ascending: false }).limit(20);
    setItems((data ?? []) as unknown as Notif[]);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications" as never).update({ read_at: new Date().toISOString() }).is("read_at", null);
    load();
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={(v) => { setOpen(v); if (v) markAllRead(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold grid place-items-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">لا توجد إشعارات</div>
        ) : (
          items.slice(0, 8).map((n) => (
            <DropdownMenuItem key={n.id} asChild>
              <Link to={n.link ?? "/dashboard"} className="flex flex-col items-start gap-0.5 py-2">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("ar-EG")}</div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
