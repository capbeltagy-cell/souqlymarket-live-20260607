export default function RegisterPage() {
  return (
    <main className="page">
      <div className="container">
        <form className="form">
          <h1>إنشاء حساب</h1>

          <label className="field">
            <span>الاسم</span>
            <input name="fullName" required />
          </label>

          <label className="field">
            <span>البريد الإلكتروني</span>
            <input type="email" name="email" required />
          </label>

          <label className="field">
            <span>رقم الهاتف</span>
            <input name="phone" />
          </label>

          <label className="field">
            <span>كلمة المرور</span>
            <input type="password" name="password" required />
          </label>

          <button className="button" type="submit">
            إنشاء الحساب
          </button>
        </form>
      </div>
    </main>
  );
}
