"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CompanyApplicationForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/company-applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyName: form.get("companyName"),
        legalName: form.get("legalName"),
        taxNumber: form.get("taxNumber"),
        commercialReg: form.get("commercialReg"),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "تعذر إرسال الطلب");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <h1>طلب إضافة شركة</h1>
      <p className="form-intro">
        يتم مراجعة كل شركة يدويًا قبل ظهورها على سوقلي.
      </p>

      {error && <div className="error-message">{error}</div>}

      <label className="field">
        <span>اسم الشركة التجاري</span>
        <input name="companyName" required />
      </label>

      <label className="field">
        <span>الاسم القانوني</span>
        <input name="legalName" />
      </label>

      <label className="field">
        <span>الرقم الضريبي</span>
        <input name="taxNumber" />
      </label>

      <label className="field">
        <span>رقم السجل التجاري</span>
        <input name="commercialReg" />
      </label>

      <button className="button full-button" type="submit" disabled={loading}>
        {loading ? "جارٍ إرسال الطلب..." : "إرسال الطلب للمراجعة"}
      </button>
    </form>
  );
}
