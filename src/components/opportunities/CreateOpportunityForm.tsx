"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CompanyOption = {
  id: string;
  name: string;
};

type Props = {
  companies: CompanyOption[];
};

export default function CreateOpportunityForm({ companies }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        type: form.get("type"),
        companyId: form.get("companyId") || null,
        sector: form.get("sector"),
        city: form.get("city"),
        budgetMin: form.get("budgetMin") || null,
        budgetMax: form.get("budgetMax") || null,
        deadline: form.get("deadline") || null,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "تعذر نشر الفرصة");
      setLoading(false);
      return;
    }

    router.push("/opportunities");
    router.refresh();
  }

  return (
    <form className="form wide-form" onSubmit={handleSubmit}>
      <span className="eyebrow">مركز فرص سوقلي</span>
      <h1>نشر فرصة أعمال</h1>
      <p className="form-intro">
        انشر طلب شراء أو مناقصة أو فرصة وكالة أو شراكة تجارية.
      </p>

      {error && <div className="error-message">{error}</div>}

      <label className="field">
        <span>عنوان الفرصة</span>
        <input
          name="title"
          minLength={5}
          maxLength={180}
          required
          placeholder="مثال: مطلوب مورد عبوات بلاستيكية"
        />
      </label>

      <label className="field">
        <span>نوع الفرصة</span>
        <select name="type" required defaultValue="PURCHASE_REQUEST">
          <option value="PURCHASE_REQUEST">طلب شراء</option>
          <option value="TENDER">مناقصة</option>
          <option value="DISTRIBUTOR">مطلوب موزع أو وكيل</option>
          <option value="SUPPLIER">مطلوب مورد</option>
          <option value="PARTNERSHIP">شراكة تجارية</option>
          <option value="IMPORT">طلب استيراد</option>
          <option value="EXPORT">فرصة تصدير</option>
          <option value="INVESTMENT">فرصة استثمار</option>
          <option value="SERVICE">خدمة أعمال</option>
        </select>
      </label>

      {companies.length > 0 && (
        <label className="field">
          <span>النشر باسم</span>
          <select name="companyId" defaultValue="">
            <option value="">حسابي الشخصي</option>
            {companies.map((company) => (
              <option value={company.id} key={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>وصف كامل للفرصة</span>
        <textarea
          name="description"
          minLength={20}
          maxLength={5000}
          rows={7}
          required
          placeholder="اشرح المطلوب والكميات والمواصفات وشروط التعامل..."
        />
      </label>

      <div className="form-grid">
        <label className="field">
          <span>القطاع</span>
          <input name="sector" placeholder="صناعة، غذاء، مقاولات..." />
        </label>

        <label className="field">
          <span>المدينة أو المحافظة</span>
          <input name="city" placeholder="القاهرة، الشرقية..." />
        </label>

        <label className="field">
          <span>الميزانية من</span>
          <input type="number" name="budgetMin" min="0" step="0.01" />
        </label>

        <label className="field">
          <span>الميزانية إلى</span>
          <input type="number" name="budgetMax" min="0" step="0.01" />
        </label>

        <label className="field">
          <span>آخر موعد للتقديم</span>
          <input type="date" name="deadline" />
        </label>
      </div>

      <button className="button full-button" type="submit" disabled={loading}>
        {loading ? "جارٍ نشر الفرصة..." : "نشر الفرصة"}
      </button>
    </form>
  );
}
