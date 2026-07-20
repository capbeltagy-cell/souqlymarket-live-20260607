const ERROR_TRANSLATIONS: Array<[RegExp, string]> = [
  [
    /unauthorized|jwt|session|not authenticated/i,
    "انتهت جلسة تسجيل الدخول. سجّل الدخول ثم حاول مرة أخرى.",
  ],
  [/forbidden|permission|row-level security|rls/i, "لا تملك صلاحية تنفيذ هذا الإجراء."],
  [
    /network|failed to fetch|fetch failed|load failed/i,
    "تعذر الاتصال بالخدمة. تحقق من الإنترنت ثم حاول مرة أخرى.",
  ],
  [/duplicate|already exists|23505/i, "هذه البيانات مسجلة بالفعل."],
  [/invalid login credentials/i, "البريد الإلكتروني أو كلمة المرور غير صحيحة."],
  [/email not confirmed/i, "يرجى تأكيد بريدك الإلكتروني أولًا."],
  [/rate limit|too many requests/i, "تم إرسال محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى."],
  [/not found|no rows/i, "تعذر العثور على البيانات المطلوبة."],
  [/timeout|timed out/i, "استغرق الطلب وقتًا أطول من المتوقع. حاول مرة أخرى."],
];

export function getArabicErrorMessage(
  error: unknown,
  fallback = "تعذر إتمام العملية. حاول مرة أخرى.",
) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message) return fallback;
  if (/[؀-ۿ]/.test(message)) return message;
  return ERROR_TRANSLATIONS.find(([pattern]) => pattern.test(message))?.[1] ?? fallback;
}
