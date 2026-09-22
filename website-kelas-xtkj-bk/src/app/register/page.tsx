import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import RegisterForm from "./RegisterForm";
import { BrandMark } from "@/components/Icons";

export const metadata = { title: "Daftar Akun" };

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-brand">
          <BrandMark size={40} />
          <div>
            <p className="register-site">Website Kelas</p>
            <p className="register-class">X TKJ</p>
          </div>
        </div>
        <h1 className="register-title">Daftar Akun Murid</h1>
        <p className="register-desc">
          Registrasi untuk murid kelas X TKJ BK. Akun developer & wali kelas
          dibuat terpisah melalui pengelola sistem.
        </p>
        <RegisterForm />
        <p className="register-login">
          Sudah punya akun?{" "}
          <Link href="/login" className="register-login-link">
            Masuk
          </Link>
        </p>
        <p className="register-back">
          <Link href="/" className="register-back-link">
            ← Kembali ke beranda
          </Link>
        </p>
      </div>

      <style>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background:
            radial-gradient(ellipse 70% 50% at 50% 0%, var(--color-accent-soft), transparent),
            var(--color-background);
        }

        .register-card {
          width: 100%;
          max-width: 400px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 2.25rem 2rem;
          box-shadow: var(--shadow-md);
        }

        .register-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .register-site {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--color-text-subtle);
        }

        .register-class {
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--color-accent);
          text-transform: uppercase;
        }

        .register-title {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 0.375rem;
          color: var(--color-text);
        }

        .register-desc {
          font-size: 0.825rem;
          color: var(--color-text-muted);
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .register-login {
          margin-top: 1.25rem;
          font-size: 0.825rem;
          color: var(--color-text-muted);
          text-align: center;
        }

        .register-login-link {
          color: var(--color-accent);
          font-weight: 600;
        }

        .register-back {
          margin-top: 1rem;
          text-align: center;
        }

        .register-back-link {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }

        .register-back-link:hover {
          color: var(--color-text);
        }
      `}</style>
    </div>
  );
}
