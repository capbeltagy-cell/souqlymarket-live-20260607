import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  User as UserIcon,
  Loader2,
  Camera,
  Building2,
  UserCircle2,
  Mail,
  Phone,
  Languages,
  ShieldCheck,
  Save,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Plus,
  Trash2,
  Pencil,
  PackageOpen,
  ExternalLink,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/integrations/supabase/client";
import { deleteListing, listMyListings } from "@/lib/listings.functions";
import { deleteMyAddress, listMyAddresses, saveMyAddress } from "@/lib/addresses.functions";
import { getArabicErrorMessage } from "@/lib/user-error";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "الملف الشخصي — سوقلي" }] }),
  component: ProfilePage,
});

type Form = {
  full_name: string;
  display_name: string;
  phone: string;
  bio: string;
  avatar_url: string;
  preferred_language: string;
};
const empty: Form = {
  full_name: "",
  display_name: "",
  phone: "",
  bio: "",
  avatar_url: "",
  preferred_language: "ar",
};

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type MyListing = {
  id: string;
  type: string;
  title_ar: string;
  title_en: string;
  images: string[] | null;
  price: number | null;
  currency: string;
  city: string | null;
  governorate: string | null;
  status: string;
  created_at: string;
};

type SavedAddress = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string;
  governorate: string;
  city: string;
  address_line: string;
  is_default: boolean;
};

const emptyAddress = {
  label: "",
  recipient_name: "",
  phone: "",
  governorate: "",
  city: "",
  address_line: "",
  is_default: true,
};

function ProfilePage() {
  const { t, locale } = useI18n();
  const { user, roles } = useAuth();
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [accountLoading, setAccountLoading] = useState(true);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const loadListings = useServerFn(listMyListings);
  const removeListing = useServerFn(deleteListing);
  const loadAddresses = useServerFn(listMyAddresses);
  const saveAddress = useServerFn(saveMyAddress);
  const removeAddress = useServerFn(deleteMyAddress);

  const ar = locale === "ar";
  const msg = (a: string, e: string) => (ar ? a : e);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, display_name, phone, bio, avatar_url, preferred_language")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error(getArabicErrorMessage(error, "تعذر تحميل بيانات الحساب."));
          setLoading(false);
          return;
        }
        if (data) {
          setForm({
            full_name: data.full_name ?? "",
            display_name: data.display_name ?? "",
            phone: data.phone ?? "",
            bio: data.bio ?? "",
            avatar_url: data.avatar_url ?? "",
            preferred_language: data.preferred_language ?? "ar",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const loadAccountData = async () => {
    setAccountLoading(true);
    try {
      const [myListings, myAddresses] = await Promise.all([loadListings(), loadAddresses()]);
      setListings(myListings as MyListing[]);
      setAddresses(myAddresses as SavedAddress[]);
    } catch (error) {
      toast.error(getArabicErrorMessage(error, "تعذر تحميل بيانات حسابك."));
    } finally {
      setAccountLoading(false);
    }
  };

  useEffect(() => {
    if (user) void loadAccountData();
    // Server functions are stable route dependencies; reload when the account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleDeleteListing = async (id: string) => {
    if (!confirm(msg("هل تريد حذف هذا الإعلان نهائيًا؟", "Permanently delete this listing?")))
      return;
    setDeletingListingId(id);
    try {
      await removeListing({ data: { id } });
      setListings((current) => current.filter((listing) => listing.id !== id));
      toast.success(msg("تم حذف الإعلان", "Listing deleted"));
    } catch (error) {
      toast.error(getArabicErrorMessage(error, "تعذر حذف الإعلان."));
    } finally {
      setDeletingListingId(null);
    }
  };

  const handleSaveAddress = async () => {
    if (
      !addressForm.recipient_name.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.governorate.trim() ||
      !addressForm.city.trim() ||
      !addressForm.address_line.trim()
    ) {
      toast.error(msg("أكمل بيانات العنوان", "Complete the address fields"));
      return;
    }
    setSavingAddress(true);
    try {
      await saveAddress({
        data: { ...addressForm, label: addressForm.label.trim() || null },
      });
      setAddressForm({ ...emptyAddress, is_default: false });
      setShowAddressForm(false);
      await loadAccountData();
      toast.success(msg("تم حفظ العنوان لاستخدامه في الطلبات", "Address saved for checkout"));
    } catch (error) {
      toast.error(getArabicErrorMessage(error, "تعذر حفظ العنوان."));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm(msg("حذف هذا العنوان؟", "Delete this address?"))) return;
    try {
      await removeAddress({ data: { id } });
      setAddresses((current) => current.filter((address) => address.id !== id));
      toast.success(msg("تم حذف العنوان", "Address deleted"));
    } catch (error) {
      toast.error(getArabicErrorMessage(error, "تعذر حذف العنوان."));
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      toast.error(msg("استخدم صورة JPG أو PNG أو WebP", "Use a JPG, PNG, or WebP image"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(msg("الحد الأقصى 5 ميجا", "Max size is 5MB"));
      return;
    }
    setUploading(true);
    try {
      const ext = AVATAR_EXTENSIONS[file.type];
      if (!ext) throw new Error(msg("صيغة الصورة غير مدعومة", "Unsupported image format"));
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data, error: sErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !data?.signedUrl) throw sErr ?? new Error("Sign URL failed");
      setForm((f) => ({ ...f, avatar_url: data.signedUrl }));
      toast.success(msg("تم رفع الصورة", "Avatar uploaded"));
    } catch (e) {
      toast.error(getArabicErrorMessage(e, "تعذر رفع الصورة."));
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    // Explicit id ensures RLS `auth.uid() = id` passes; only own row is writeable.
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: form.full_name || null,
      display_name: form.display_name || null,
      phone: form.phone || null,
      bio: form.bio || null,
      avatar_url: form.avatar_url || null,
      preferred_language: form.preferred_language || "ar",
    });
    setSaving(false);
    if (error) toast.error(getArabicErrorMessage(error, "تعذر حفظ بيانات الحساب."));
    else {
      setEditingProfile(false);
      toast.success(t("profile_updated"));
    }
  };

  const initial = (form.display_name || form.full_name || user?.email || "?")[0]?.toUpperCase();
  const isCompany = roles.includes("company");
  const isAgent = roles.includes("agent");
  const completedFields = [
    form.full_name,
    form.display_name,
    form.phone,
    form.bio,
    form.avatar_url,
  ].filter((value) => value.trim()).length;
  const completion = Math.round((completedFields / 5) * 100);
  const BackIcon = ar ? ArrowRight : ArrowLeft;

  if (loading)
    return (
      <Shell>
        <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>
      </Shell>
    );

  return (
    <Shell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <UserIcon className="h-4 w-4" />
              {msg("حسابك على سوقلي", "Your Souqly account")}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("profile_title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {msg(
                "حدّث بياناتك وطريقة ظهورك في المنصة.",
                "Keep your details and public identity up to date.",
              )}
            </p>
          </div>
          <Button asChild type="button" variant="ghost" className="hidden sm:inline-flex">
            <Link to="/dashboard">
              <BackIcon className="me-2 h-4 w-4" />
              {t("nav_dashboard")}
            </Link>
          </Button>
        </div>

        <form onSubmit={save} className="grid items-start gap-5 lg:grid-cols-[19rem_1fr]">
          <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:sticky lg:top-24">
            <div className="h-24 bg-gradient-to-br from-primary via-primary/85 to-primary/55" />
            <div className="px-5 pb-5">
              <div className="relative -mt-11 mb-3 w-fit">
                {form.avatar_url ? (
                  <img
                    src={form.avatar_url}
                    alt={
                      form.display_name || form.full_name || msg("صورة الحساب", "Profile avatar")
                    }
                    className="h-24 w-24 rounded-2xl border-4 border-card bg-card object-cover shadow-md"
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-card bg-primary text-3xl font-bold text-primary-foreground shadow-md">
                    {initial}
                  </div>
                )}
                {editingProfile && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    aria-label={msg("تغيير الصورة", "Change avatar")}
                    className="absolute -bottom-1 -end-1 grid h-9 w-9 place-items-center rounded-xl border-2 border-card bg-primary text-primary-foreground shadow transition hover:bg-primary-hover disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAvatar(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <h2 className="truncate text-lg font-bold">
                {form.display_name || form.full_name || msg("مستخدم سوقلي", "Souqly user")}
              </h2>
              <div className="mt-1 flex items-center gap-2 truncate text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate" dir="ltr">
                  {user?.email}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {roles.length === 0 ? (
                  <Badge variant="secondary">{msg("مستخدم", "User")}</Badge>
                ) : (
                  roles.map((r) => (
                    <Badge key={r} variant="secondary" className="capitalize">
                      {r}
                    </Badge>
                  ))
                )}
              </div>
              <div className="mt-5 rounded-xl bg-muted/60 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                  <span>{msg("اكتمال الملف", "Profile completion")}</span>
                  <span className="text-primary">{completion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant={editingProfile ? "secondary" : "outline"}
                className="mt-4 w-full justify-start"
                onClick={() => setEditingProfile((value) => !value)}
              >
                <Pencil className="me-2 h-4 w-4" />
                {editingProfile
                  ? msg("إغلاق الإعدادات", "Close settings")
                  : msg("إعدادات الحساب", "Account settings")}
              </Button>
              {(isCompany || isAgent) && (
                <div className="mt-4 space-y-2">
                  {isCompany && (
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                    >
                      <Link to="/company">
                        <Building2 className="h-4 w-4" />
                        {msg("ملف الشركة", "Company profile")}
                      </Link>
                    </Button>
                  )}
                  {isAgent && (
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                    >
                      <Link to="/agent">
                        <UserCircle2 className="h-4 w-4" />
                        {msg("ملف المسوق", "Marketer profile")}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-6 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">{msg("المعلومات الأساسية", "Basic information")}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {msg(
                    "هذه البيانات تساعدنا في تخصيص تجربتك.",
                    "These details help personalize your experience.",
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("profile_full_name")}</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  dir={ar ? "rtl" : "ltr"}
                  disabled={!editingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("profile_display_name")}</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder={form.full_name}
                  dir={ar ? "rtl" : "ltr"}
                  disabled={!editingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {t("profile_phone")}
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+20 1X XXX XXXX"
                  inputMode="tel"
                  dir="ltr"
                  disabled={!editingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  {msg("اللغة المفضلة", "Preferred language")}
                </Label>
                <select
                  value={form.preferred_language}
                  onChange={(e) => setForm({ ...form, preferred_language: e.target.value })}
                  disabled={!editingProfile}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <Label>{t("profile_bio")}</Label>
                <span className="text-xs text-muted-foreground">{form.bio.length}/500</span>
              </div>
              <Textarea
                rows={5}
                maxLength={500}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                dir={ar ? "rtl" : "ltr"}
                placeholder={msg(
                  "اكتب نبذة قصيرة عنك واهتماماتك...",
                  "Share a short introduction about you...",
                )}
                className="resize-none"
                disabled={!editingProfile}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row">
              <Button asChild type="button" variant="ghost">
                <Link to="/dashboard">
                  <BackIcon className="me-2 h-4 w-4" />
                  {t("nav_dashboard")}
                </Link>
              </Button>
              {editingProfile && (
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-primary hover:bg-primary-hover sm:ms-auto"
                >
                  {saving ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="me-2 h-4 w-4" />
                  )}
                  {t("profile_save")}
                </Button>
              )}
            </div>
          </section>
        </form>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <PackageOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">{msg("إعلاناتي", "My listings")}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {msg(
                    "كل الإعلانات المنشورة من شركتك في مكان واحد.",
                    "Manage every listing published by your company.",
                  )}
                </p>
              </div>
            </div>
            {isCompany && (
              <Button asChild size="sm">
                <Link to="/listings/new">
                  <Plus className="me-2 h-4 w-4" />
                  {msg("إضافة إعلان", "New listing")}
                </Link>
              </Button>
            )}
          </div>

          {accountLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-10 text-center">
              <PackageOpen className="mx-auto h-9 w-9 text-muted-foreground/50" />
              <p className="mt-3 font-medium">{msg("لا توجد إعلانات بعد", "No listings yet")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {msg(
                  "إعلانات شركتك ستظهر هنا تلقائيًا.",
                  "Your company listings will appear here automatically.",
                )}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {listings.map((listing) => {
                const title = ar
                  ? listing.title_ar || listing.title_en
                  : listing.title_en || listing.title_ar;
                return (
                  <article
                    key={listing.id}
                    className="flex gap-3 rounded-xl border border-border p-3 transition hover:border-primary/30"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {listing.images?.[0] ? (
                        <img
                          src={listing.images[0]}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <PackageOpen className="m-auto h-full w-7 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-semibold">{title}</h3>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {listing.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[listing.governorate, listing.city].filter(Boolean).join("، ")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Button
                          asChild
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                        >
                          <Link to="/listings/$id" params={{ id: listing.id }}>
                            <ExternalLink className="me-1 h-3.5 w-3.5" />
                            {msg("عرض", "View")}
                          </Link>
                        </Button>
                        <Button
                          asChild
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                        >
                          <Link to="/listings/$id/edit" params={{ id: listing.id }}>
                            <Pencil className="me-1 h-3.5 w-3.5" />
                            {msg("تعديل", "Edit")}
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={deletingListingId === listing.id}
                          onClick={() => void handleDeleteListing(listing.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                        >
                          {deletingListingId === listing.id ? (
                            <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="me-1 h-3.5 w-3.5" />
                          )}
                          {msg("حذف", "Delete")}
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
          <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">{msg("عناويني المحفوظة", "Saved addresses")}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {msg(
                    "احفظ العنوان مرة واحدة واستخدمه تلقائيًا في الطلبات.",
                    "Save once and reuse it automatically during checkout.",
                  )}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAddressForm((value) => !value)}
            >
              <Plus className="me-2 h-4 w-4" />
              {msg("إضافة عنوان", "Add address")}
            </Button>
          </div>

          {showAddressForm && (
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  placeholder={msg("اسم العنوان: المنزل أو العمل", "Label: Home or Work")}
                />
                <Input
                  value={addressForm.recipient_name}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, recipient_name: e.target.value })
                  }
                  placeholder={msg("اسم المستلم", "Recipient name")}
                />
                <Input
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  placeholder={msg("رقم الهاتف", "Phone number")}
                  inputMode="tel"
                  dir="ltr"
                />
                <Input
                  value={addressForm.governorate}
                  onChange={(e) => setAddressForm({ ...addressForm, governorate: e.target.value })}
                  placeholder={msg("المحافظة", "Governorate")}
                />
                <Input
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  placeholder={msg("المدينة", "City")}
                />
                <Input
                  value={addressForm.address_line}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line: e.target.value })}
                  placeholder={msg("العنوان بالتفصيل", "Full address")}
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                />
                {msg("استخدمه كعنوان افتراضي", "Use as default address")}
              </label>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  disabled={savingAddress}
                  onClick={() => void handleSaveAddress()}
                >
                  {savingAddress && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {msg("حفظ العنوان", "Save address")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddressForm(false)}>
                  {msg("إلغاء", "Cancel")}
                </Button>
              </div>
            </div>
          )}

          {!accountLoading && addresses.length === 0 && !showAddressForm ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {msg("لم تحفظ أي عنوان بعد.", "No saved addresses yet.")}
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {addresses.map((address) => (
                <article key={address.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        {address.label || msg("عنوان", "Address")}
                        {address.is_default && (
                          <Badge variant="secondary">{msg("افتراضي", "Default")}</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm">
                        {address.recipient_name} · <span dir="ltr">{address.phone}</span>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {address.governorate}، {address.city}، {address.address_line}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => void handleDeleteAddress(address.id)}
                      className="shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-2">
      <SiteHeader />
      <div className="container-souqly py-8 flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
