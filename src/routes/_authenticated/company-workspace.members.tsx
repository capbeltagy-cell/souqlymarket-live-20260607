import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCompanyMembers, updateCompanyMember } from "@/lib/company-workspace.functions";

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

function CompanyMembersPage() {
  const fetchMembers = useServerFn(listCompanyMembers);
  const saveMember = useServerFn(updateCompanyMember);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
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
        {!payload ? (
          <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-primary" />
        ) : (
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
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
