import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  inviteCompanyMember,
  listCompanyMembers,
  revokeCompanyInvitation,
  updateCompanyMember,
} from "@/lib/company-workspace.functions";

export const Route = createFileRoute("/_authenticated/company-workspace/members")({
  head: () => ({ meta: [{ title: "أعضاء الشركة — سوقلي" }] }),
  component: CompanyMembersPage,
});

type Payload = Awaited<ReturnType<typeof listCompanyMembers>>;
type CompanyMember = {
  id: string;
  role: string;
  status: string;
  joined_at: string;
  profile: { display_name?: string | null; full_name?: string | null } | null;
};
type CompanyInvitation = { id: string; email: string; role: string; expires_at: string };

function CompanyMembersPage() {
  const fetchMembers = useServerFn(listCompanyMembers);
  const saveMember = useServerFn(updateCompanyMember);
  const createInvitation = useServerFn(inviteCompanyMember);
  const cancelInvitation = useServerFn(revokeCompanyInvitation);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [invitationPath, setInvitationPath] = useState<string | null>(null);
  const load = useCallback(
    () =>
      fetchMembers()
        .then(setPayload)
        .catch((error: Error) => toast.error(error.message)),
    [fetchMembers],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const update = async (
    member: Payload["members"][number],
    changes: { role?: string; status?: string },
  ) => {
    setBusy(member.id);
    try {
      await saveMember({
        data: {
          memberId: member.id,
          role: (changes.role ?? member.role) as
            | "admin"
            | "manager"
            | "sales"
            | "inventory"
            | "viewer",
          status: (changes.status ?? member.status) as "active" | "suspended",
        },
      });
      toast.success("تم تحديث صلاحيات العضو بنجاح");
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("invite");
    try {
      const result = await createInvitation({
        data: {
          email,
          role: inviteRole as "admin" | "manager" | "sales" | "inventory" | "viewer",
        },
      });
      setInvitationPath(result.invitationPath);
      setEmail("");
      toast.success("تم إنشاء دعوة العضو بأمان");
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const copyInvitation = async () => {
    if (!invitationPath) return;
    await navigator.clipboard.writeText(`${window.location.origin}${invitationPath}`);
    toast.success("تم نسخ رابط الدعوة");
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <SiteHeader />
      <main className="container-souqly flex-1 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-primary">{payload?.workspace.companyName}</p>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Users className="h-6 w-6" /> أعضاء الشركة
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link to="/company-workspace">مساحة العمل</Link>
          </Button>
        </div>
        {payload?.workspace.canManageMembers && (
          <form onSubmit={invite} className="mb-6 rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <UserPlus className="h-5 w-5 text-primary" />
              دعوة عضو جديد
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="البريد الإلكتروني للعضو"
                className="min-w-60 flex-1"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مسؤول</SelectItem>
                  <SelectItem value="manager">مدير</SelectItem>
                  <SelectItem value="sales">مبيعات</SelectItem>
                  <SelectItem value="inventory">مخزون</SelectItem>
                  <SelectItem value="viewer">مشاهدة</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={busy === "invite"}>
                {busy === "invite" && <Loader2 className="me-2 h-4 w-4 animate-spin" />}إنشاء الدعوة
              </Button>
            </div>
            {invitationPath && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-primary/5 p-3 text-sm">
                <span>الرابط جاهز للمشاركة مع البريد المحدد.</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyInvitation()}
                >
                  <Copy className="me-1 h-4 w-4" />
                  نسخ الرابط
                </Button>
              </div>
            )}
          </form>
        )}
        {!payload ? (
          <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-primary" />
        ) : (
          <div className="space-y-6">
            {payload.invitations.length > 0 && (
              <section>
                <h2 className="mb-3 font-semibold">الدعوات المعلقة</h2>
                <div className="space-y-2">
                  {payload.invitations.map((invitation: CompanyInvitation) => (
                    <div
                      key={invitation.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
                    >
                      <div>
                        <strong>{invitation.email}</strong>
                        <p className="text-xs text-muted-foreground">
                          الصلاحية: {invitation.role} · تنتهي{" "}
                          {new Date(invitation.expires_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === invitation.id}
                        onClick={async () => {
                          setBusy(invitation.id);
                          try {
                            await cancelInvitation({ data: { invitationId: invitation.id } });
                            toast.success("تم إلغاء الدعوة");
                            await load();
                          } catch (error) {
                            toast.error((error as Error).message);
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        <X className="me-1 h-4 w-4" />
                        إلغاء
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="mb-3 font-semibold">الأعضاء النشطون</h2>
              <div className="space-y-3">
                {payload.members.map((member: CompanyMember) => {
                  const owner = member.role === "owner";
                  const name =
                    member.profile?.display_name || member.profile?.full_name || "عضو الشركة";
                  return (
                    <div
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          {name}
                          {owner && (
                            <Badge>
                              <ShieldCheck className="me-1 h-3.5 w-3.5" />
                              المالك
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          انضم {new Date(member.joined_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      {!owner && payload.workspace.canManageMembers ? (
                        <div className="flex gap-2">
                          <Select
                            value={member.role}
                            disabled={busy === member.id}
                            onValueChange={(role) => void update(member, { role })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">مسؤول</SelectItem>
                              <SelectItem value="manager">مدير</SelectItem>
                              <SelectItem value="sales">مبيعات</SelectItem>
                              <SelectItem value="inventory">مخزون</SelectItem>
                              <SelectItem value="viewer">مشاهدة</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={member.status}
                            disabled={busy === member.id}
                            onValueChange={(status) => void update(member, { status })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">نشط</SelectItem>
                              <SelectItem value="suspended">موقوف</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        !owner && <Badge variant="secondary">{member.role}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
