"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  applicationId: string;
};

export default function CompanyApplicationActions({
  applicationId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function approve() {
    setError("");
    setLoading("approve");

    const response = await fetch(
      `/api/admin/company-applications/${applicationId}/approve`,
      { method: "POST" }
    );

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "تعذر اعتماد الشركة");
      setLoading(null);
      return;
    }

    router.refresh();
  }

  async function reject() {
    const adminNotes =
      window.prompt("اكتب سبب الرفض أو التعديلات المطلوبة:")?.trim();

    if (!adminNotes) {
      return;
    }

    setError("");
    setLoading("reject");

    const response = await fetch(
      `/api/admin/company-applications/${applicationId}/reject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminNotes }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "تعذر رفض الطلب");
      setLoading(null);
      return;
    }

    router.refresh();
  }

  return (
    <div className="admin-actions">
      {error && <div className="error-message">{error}</div>}

      <button
        className="button"
        type="button"
        onClick={approve}
        disabled={loading !== null}
      >
        {loading === "approve" ? "جارٍ الاعتماد..." : "اعتماد وإنشاء الشركة"}
      </button>

      <button
        className="button danger-button"
        type="button"
        onClick={reject}
        disabled={loading !== null}
      >
        {loading === "reject" ? "جارٍ الرفض..." : "رفض الطلب"}
      </button>
    </div>
  );
}
