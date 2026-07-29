"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CompanyData = {
  id: string;
  name: string;
  description: string | null;
  sector: string | null;
  city: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  catalogUrl: string | null;
  establishedYear: number | null;
  employeeCount: number | null;
};

export default function CompanyProfileForm({ company }: { company: CompanyData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description"),
        sector: form.get("sector"),
        city: form.get("city"),
        website: form.get("website"),
        contactEmail: form.get("contactEmail"),
        contactPhone: form.get("contactPhone"),
        logoUrl: form.get("logoUrl"),
        coverUrl: form.get("coverUrl"),
        catalogUrl: form.get("catalogUrl"),
        establishedYear: form.get("establishedYear") || null,
        employeeCount: form.get("employeeCount") || null,
      }),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error || "تعذر حفظ البيانات");
      return;
    }

    setMessage("تم حفظ ملف الشركة بنجاح");
    router.refresh();
  }

  return (
    <form className="form wide-form" onSubmit={handleSubmit}>
      <span className="eyebrow">إعدادات الشركة</span>
      <h1>تعديل ملف الشركة</h1>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="form-grid">
        <label className="field">
          <span>اسم الشركة</span>
          <input name="name" defaultValue={company.name} required />
        </label>

        <label className="field">
          <span>القطاع</span>
          <input name="sector" defaultValue={company.sector || ""} placeholder="الصناعات الغذائية" />
        </label>

        <label className="field">
          <span>المدينة</span>
          <input name="city" defaultValue={company.city || ""} placeholder="القاهرة" />
        </label>

        <label className="field">
          <span>سنة التأسيس</span>
          <input type="number" name="establishedYear" defaultValue={company.establishedYear || ""} min="1800" />
        </label>

        <label className="field">
          <span>عدد الموظفين</span>
          <input type="number" name="employeeCount" defaultValue={company.employeeCount || ""} min="0" />
        </label>

        <label className="field">
          <span>رقم التواصل</span>
          <input name="contactPhone" defaultValue={company.contactPhone || ""} />
        </label>

        <label className="field">
          <span>البريد التجاري</span>
          <input type="email" name="contactEmail" defaultValue={company.contactEmail || ""} />
        </label>

        <label className="field">
          <span>الموقع الإلكتروني</span>
          <input type="url" name="website" defaultValue={company.website || ""} placeholder="https://example.com" />
        </label>

        <label className="field">
          <span>رابط الشعار</span>
          <input type="url" name="logoUrl" defaultValue={company.logoUrl || ""} />
        </label>

        <label className="field">
          <span>رابط صورة الغلاف</span>
          <input type="url" name="coverUrl" defaultValue={company.coverUrl || ""} />
        </label>

        <label className="field">
          <span>رابط الكتالوج PDF</span>
          <input type="url" name="catalogUrl" defaultValue={company.catalogUrl || ""} />
        </label>
      </div>

      <label className="field">
        <span>نبذة عن الشركة</span>
        <textarea name="description" rows={7} maxLength={3000} defaultValue={company.description || ""} />
      </label>

      <button className="button full-button" type="submit" disabled={loading}>
        {loading ? "جارٍ الحفظ..." : "حفظ ملف الشركة"}
      </button>
    </form>
  );
}
