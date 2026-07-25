import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import {
  deleteNotification,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotificationLink,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "الإشعارات — سوقلي" }] }),
  component: NotificationsPage,
});

type Notification = Awaited<ReturnType<typeof listMyNotifications>>[number];

function NotificationsPage() {
  const fetchNotifications = useServerFn(listMyNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const remove = useServerFn(deleteNotification);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchNotifications());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل الإشعارات.");
    }
  }, [fetchNotifications]);

  useEffect(() => {
    void load();
  }, [load]);

  const readAll = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await markAll();
      toast.success("تم تحديد جميع الإشعارات كمقروءة");
      await load();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "تعذر تحديث الإشعارات.");
    } finally {
      setBusy(false);
    }
  };

  const openNotification = async (notification: Notification) => {
    if (!notification.read_at) {
      try {
        await markOne({ data: { notificationId: notification.id } });
      } catch {
        toast.error("تعذر تحديث حالة الإشعار.");
        return;
      }
    }
    window.location.assign(normalizeNotificationLink(notification.link));
  };

  const removeOne = async (notificationId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await remove({ data: { notificationId } });
      setItems((current) => current?.filter((item) => item.id !== notificationId) ?? []);
      toast.success("تم حذف الإشعار");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "تعذر حذف الإشعار.");
    } finally {
      setBusy(false);
    }
  };

  const unread = items?.filter((item) => !item.read_at).length ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <SiteHeader />
      <main className="container-souqly flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Bell className="h-6 w-6 text-primary" />
              الإشعارات
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unread ? `${unread} إشعار غير مقروء` : "لا توجد إشعارات جديدة"}
            </p>
          </div>
          <Button variant="outline" disabled={busy || unread === 0} onClick={() => void readAll()}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            تحديد الكل كمقروء
          </Button>
        </div>

        {items === null && !error ? (
          <div className="grid min-h-64 place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => void load()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : items?.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">لا توجد إشعارات حتى الآن</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ستظهر هنا تحديثات الطلبات والرسائل والحساب.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items?.map((notification) => (
              <article
                key={notification.id}
                className={`flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm ${
                  notification.read_at ? "" : "border-primary/35 bg-primary/5"
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => void openNotification(notification)}
                >
                  <div className="font-semibold">{notification.title}</div>
                  {notification.body && (
                    <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                  )}
                  <time
                    dateTime={notification.created_at}
                    className="mt-2 block text-xs text-muted-foreground"
                  >
                    {new Date(notification.created_at).toLocaleString("ar-EG")}
                  </time>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="حذف الإشعار"
                  disabled={busy}
                  onClick={() => void removeOne(notification.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
