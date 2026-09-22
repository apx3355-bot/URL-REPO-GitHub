"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log ke console server-side untuk debugging; TIDAK ditampilkan ke user
    console.error("[app-error]", error.message);
  }, [error]);

  return (
    <div className="err-page">
      <div className="err-container">
        <div className="err-card">
          <p className="err-code">500 — SERVER ERROR</p>
          <h1 className="err-title">Terjadi kesalahan pada server</h1>
          <p className="err-msg">
            Maaf, sesuatu yang tidak terduga terjadi. Silakan coba lagi atau
            kembali ke beranda.
          </p>
          <div className="err-actions">
            <button onClick={reset} className="err-btn err-btn--primary">Coba Lagi</button>
            <Link href="/" className="err-btn">Beranda</Link>
          </div>
        </div>
      </div>

      <style>{`
        .err-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          background: var(--color-background);
        }
        .err-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
          width: 100%;
        }
        .err-card {
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 3rem 2rem;
        }
        .err-code {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-danger);
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
        }
        .err-title {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--color-text);
          margin-bottom: 0.625rem;
        }
        .err-msg {
          font-size: 0.9rem;
          color: var(--color-text-muted);
          margin-bottom: 1.75rem;
          line-height: 1.7;
        }
        .err-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .err-btn {
          display: inline-block;
          padding: 0.5625rem 1.125rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 550;
          border: 1px solid var(--color-border);
          color: var(--color-text);
          background: transparent;
          transition: border-color 0.15s, color 0.15s;
        }
        .err-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        .err-btn--primary {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
        }
        .err-btn--primary:hover {
          background: var(--color-primary-hover);
          border-color: var(--color-primary-hover);
          color: white;
        }
      `}</style>
    </div>
  );
}
