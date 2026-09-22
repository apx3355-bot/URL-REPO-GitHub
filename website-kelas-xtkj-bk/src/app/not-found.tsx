import Link from "next/link";
import PublicLayout from "@/components/PublicLayout";

export const metadata = {
  title: "Halaman Tidak Ditemukan",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="nf-page">
        <div className="nf-container">
          <div className="nf-card">
            <p className="nf-code">404 — NOT FOUND</p>
            <h1 className="nf-title">Halaman tidak ditemukan</h1>
            <p className="nf-msg">
              Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
            </p>
            <div className="nf-actions">
              <Link href="/" className="nf-btn nf-btn--primary">Beranda</Link>
              <Link href="/galeri" className="nf-btn">Lihat Galeri</Link>
            </div>
          </div>
        </div>

        <style>{`
          .nf-page {
            padding: 5rem 0;
            min-height: 60vh;
            display: flex;
            align-items: center;
          }
          .nf-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1.25rem;
            width: 100%;
          }
          .nf-card {
            max-width: 480px;
            margin: 0 auto;
            text-align: center;
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            padding: 3rem 2rem;
          }
          .nf-code {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--color-warning);
            letter-spacing: 0.1em;
            margin-bottom: 0.5rem;
          }
          .nf-title {
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: var(--color-text);
            margin-bottom: 0.625rem;
          }
          .nf-msg {
            font-size: 0.9rem;
            color: var(--color-text-muted);
            margin-bottom: 1.75rem;
            line-height: 1.7;
          }
          .nf-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: center;
            flex-wrap: wrap;
          }
          .nf-btn {
            display: inline-block;
            padding: 0.5625rem 1.125rem;
            border-radius: var(--radius-md);
            font-size: 0.85rem;
            font-weight: 550;
            border: 1px solid var(--color-border);
            color: var(--color-text);
            transition: border-color 0.15s, color 0.15s;
          }
          .nf-btn:hover {
            border-color: var(--color-accent);
            color: var(--color-accent);
          }
          .nf-btn--primary {
            background: var(--color-primary);
            border-color: var(--color-primary);
            color: white;
          }
          .nf-btn--primary:hover {
            background: var(--color-primary-hover);
            border-color: var(--color-primary-hover);
            color: white;
          }
        `}</style>
      </div>
    </PublicLayout>
  );
}
