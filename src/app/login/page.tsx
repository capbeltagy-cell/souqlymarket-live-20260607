export default function LoginPage() {
  return (
    <main className="page">
      <div className="container">
        <form className="form">
          <h1>تسجيل الدخول</h1>

          <label className="field">
            <span>البريد الإلكتروني</span>
            <input type="email" name="email" required />
          </label>

          <label className="field">
            <span>كلمة المرور</span>
            <input type="password" name="password" required />
          </label>

          <button className="button" type="submit">
            دخول
          </button>
        </form>
      </div>
    </main>
  );
}
