import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import LoginForm from "./LoginForm";
import { BrandMark } from "@/components/Icons";

export const metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <BrandMark size={40} />
          <div>
            <p className="login-site">Website Kelas</p>
            <p className="login-class">X TKJ</p>
          </div>
        </div>
        <h1 className="login-title">Masuk</h1>
        <p className="login-desc">Pilih role Anda, lalu masuk dengan akun terdaftar.</p>
        <LoginForm nextPath={safeNext} />
        <p className="login-register">
          Belum punya akun?{" "}
          <Link href="/register" className="login-register-link">
            DAFTAR
          </Link>
        </p>
        <p className="login-back">
          <Link href="/" className="login-back-link">
            ← Kembali ke beranda
          </Link>
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background:
            radial-gradient(ellipse 70% 50% at 50% 0%, var(--color-accent-soft), transparent),
            var(--color-background);
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 2.25rem 2rem;
          box-shadow: var(--shadow-md);
        }

        .login-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .login-site {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--color-text-subtle);
        }

        .login-class {
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--color-accent);
          text-transform: uppercase;
        }

        .login-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 0.375rem;
          color: var(--color-text);
        }

        .login-desc {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: 1.5rem;
        }

        .login-register {
          margin-top: 1.25rem;
          font-size: 0.825rem;
          color: var(--color-text-muted);
          text-align: center;
        }

        .login-register-link {
          color: var(--color-accent);
          font-weight: 650;
          letter-spacing: 0.04em;
        }

        .login-register-link:hover {
          text-decoration: underline;
        }

        .login-back {
          margin-top: 1rem;
          text-align: center;
        }

        .login-back-link {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }

        .login-back-link:hover {
          color: var(--color-text);
        }
      `}</style>
    </div>
  );
}
