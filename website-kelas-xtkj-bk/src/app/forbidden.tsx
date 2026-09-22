import Link from "next/link";
import PublicLayout from "@/components/PublicLayout";
import { ShieldIcon } from "@/components/Icons";

export default function ForbiddenContent({
  title = "403 — ACCESS DENIED",
  message = "Anda tidak memiliki permission untuk mengakses halaman ini.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <PublicLayout>
      <div className="forbidden-page">
        <div className="container">
          <div className="forbidden-card">
            <div className="forbidden-icon">
              <ShieldIcon size={40} />
            </div>
            <p className="forbidden-code">{title}</p>
            <h1 className="forbidden-title">Akses Ditolak</h1>
            <p className="forbidden-msg">{message}</p>
            <div className="forbidden-actions">
              <Link href="/dashboard" className="forbidden-btn forbidden-btn--primary">
                Ke Dashboard
              </Link>
              <Link href="/" className="forbidden-btn">
                Beranda
              </Link>
            </div>
          </div>
        </div>

        <style>{`
          .forbidden-page {
            padding: 5rem 0;
            min-height: 60vh;
            display: flex;
            align-items: center;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1.25rem;
            width: 100%;
          }

          .forbidden-card {
            max-width: 480px;
            margin: 0 auto;
            text-align: center;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            padding: 3rem 2rem;
          }

          .forbidden-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: var(--color-danger-soft);
            color: var(--color-danger);
            margin-bottom: 1.25rem;
          }

          .forbidden-code {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-danger);
            letter-spacing: 0.1em;
            margin-bottom: 0.5rem;
          }

          .forbidden-title {
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: var(--color-text);
            margin-bottom: 0.625rem;
          }

          .forbidden-msg {
            font-size: 0.9rem;
            color: var(--color-text-muted);
            margin-bottom: 1.75rem;
            line-height: 1.7;
          }

          .forbidden-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .forbidden-btn {
            display: inline-block;
            padding: 0.5625rem 1.125rem;
            border-radius: var(--radius-md);
            font-size: 0.85rem;
            font-weight: 550;
            border: 1px solid var(--color-border);
            color: var(--color-text);
            transition: border-color 0.15s, color 0.15s;
          }

          .forbidden-btn:hover {
            border-color: var(--color-accent);
            color: var(--color-accent);
          }

          .forbidden-btn--primary {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: white;
          }

          .forbidden-btn--primary:hover {
            background: var(--color-primary-hover);
            border-color: var(--color-primary-hover);
            color: white;
          }
        `}</style>
      </div>
    </PublicLayout>
  );
}
