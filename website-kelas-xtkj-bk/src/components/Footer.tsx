import Link from "next/link";
import { getClassInfo } from "@/data/classInfo";
import { BrandMark } from "@/components/Icons";

const footerLinks = [
  { href: "/", label: "Beranda" },
  { href: "/struktur", label: "Struktur Kelas" },
  { href: "/anggota", label: "Anggota" },
  { href: "/galeri", label: "Galeri" },
  { href: "/tentang", label: "Tentang" },
];

// Maintenance V0.1 — identitas footer mengikuti Settings (SSOT), bukan
// konstanta statis; fallback aman saat DB gagal (getClassInfo handles it).
export default async function Footer() {
  const classInfo = await getClassInfo();
  const year = 2026;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <BrandMark size={32} />
              <span className="footer-brand-text">X TKJ BK</span>
            </div>
            <p className="footer-desc">
              Kelas {classInfo.name} — {classInfo.jurusan}
              <br />
              Tahun Ajaran {classInfo.tahunAjaran}
            </p>
            <p className="footer-terminal" aria-label="Status website">
              <span className="terminal-prompt" aria-hidden="true">$</span> status:{" "}
              <span className="terminal-ok">● online</span>
            </p>
          </div>

          <nav className="footer-nav" aria-label="Navigasi footer">
            <p className="footer-nav-heading">Halaman</p>
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="footer-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="footer-info">
            <p className="footer-nav-heading">Informasi</p>
            <p className="footer-detail">
              <span className="detail-label">Jurusan</span>
              <span>{classInfo.jurusan}</span>
            </p>
            <p className="footer-detail">
              <span className="detail-label">Wali Kelas</span>
              <span>{classInfo.waliKelas}</span>
            </p>
            <p className="footer-detail">
              <span className="detail-label">Tahun Ajaran</span>
              <span>{classInfo.tahunAjaran}</span>
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            &copy; {year} Kelas {classInfo.name}. Semua hak dilindungi.
          </p>
          <p className="footer-copy footer-copy--right">
            Website resmi kelas {classInfo.name}
          </p>
        </div>
      </div>

      <style>{`
        .footer {
          background: var(--color-brand);
          color: rgba(248,250,252,0.7);
          margin-top: auto;
          border-top: 1px solid var(--color-border);
        }

        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 3rem 1.25rem 1.5rem;
        }

        .footer-top {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid rgba(248,250,252,0.08);
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .footer-brand-text {
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--color-on-brand);
          text-transform: uppercase;
        }

        .footer-desc {
          font-size: 0.8rem;
          line-height: 1.7;
          color: rgba(248,250,252,0.5);
        }

        .footer-terminal {
          margin-top: 1rem;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: rgba(248,250,252,0.55);
          background: rgba(248,250,252,0.04);
          border: 1px solid rgba(248,250,252,0.08);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
          display: inline-block;
        }

        .terminal-prompt {
          color: var(--color-accent);
          margin-right: 0.25rem;
        }

        .terminal-ok {
          color: var(--color-success);
        }

        .footer-nav-heading {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(248,250,252,0.4);
          margin-bottom: 0.875rem;
        }

        .footer-nav {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .footer-link {
          font-size: 0.85rem;
          color: rgba(248,250,252,0.6);
          transition: color 0.15s;
          padding: 0.125rem 0;
        }

        .footer-link:hover {
          color: var(--color-accent);
        }

        .footer-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .footer-detail {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          font-size: 0.8rem;
        }

        .detail-label {
          color: rgba(248,250,252,0.4);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .footer-bottom {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding-top: 1.5rem;
        }

        .footer-copy {
          font-size: 0.75rem;
          color: rgba(248,250,252,0.35);
        }

        @media (min-width: 640px) {
          .footer-top {
            grid-template-columns: 1fr 1fr;
          }

          .footer-brand {
            grid-column: 1 / -1;
          }
        }

        @media (min-width: 768px) {
          .footer-inner {
            padding: 3.5rem 2rem 2rem;
          }

          .footer-top {
            grid-template-columns: 2fr 1fr 1.5fr;
          }

          .footer-brand {
            grid-column: auto;
          }

          .footer-bottom {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }
      `}</style>
    </footer>
  );
}
