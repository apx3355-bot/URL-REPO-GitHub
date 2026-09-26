import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/PublicLayout";
import { classInfo, getClassInfo, getEditableContent } from "@/data/classInfo";

export const metadata: Metadata = {
  title: "Tentang",
  description: `Tentang kelas ${classInfo.name} — identitas, jurusan, dan tujuan website kelas.`,
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <dt className="info-label">{label}</dt>
      <dd className="info-value">{value}</dd>
    </div>
  );
}

// Maintenance V0.1 — halaman ini tidak lagi menampilkan teks statis lama:
// identitas kelas & jumlah anggota mengikuti database/Settings (dinamis),
// deskripsi kelas/website & catatan kontak diedit Developer/Wali Kelas
// lewat dashboard Settings (konten editorial).
export default async function TentangPage() {
  const [info, content] = await Promise.all([getClassInfo(), getEditableContent()]);

  return (
    <PublicLayout>
      <div className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="breadcrumb-link">Beranda</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Tentang</span>
          </nav>
          <h1 className="page-title">Tentang Kelas</h1>
          <p className="page-desc">
            Informasi kelas {info.name} dan website ini.
          </p>
        </div>
      </div>

      <div className="container page-body">
        <div className="about-layout">
          {/* IDENTITAS */}
          <section className="about-section">
            <h2 className="section-title">Identitas Kelas</h2>
            <dl className="info-list">
              <InfoRow label="Nama Kelas" value={info.name} />
              <InfoRow label="Program Keahlian" value={info.jurusan} />
              <InfoRow label="Wali Kelas" value={info.waliKelas} />
              <InfoRow label="Tahun Ajaran" value={info.tahunAjaran} />
              <InfoRow label="Jumlah Siswa" value={`${info.totalAnggota} siswa`} />
              <InfoRow label="Sekolah" value={info.sekolah} />
              <InfoRow label="Angkatan" value={info.angkatan} />
            </dl>
          </section>

          {/* DESKRIPSI (editable via dashboard) */}
          <section className="about-section">
            <h2 className="section-title">Tentang Kelas {info.name}</h2>
            <div className="prose">
              {content.classDescription.split("\n").filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {/* TENTANG WEBSITE (editable via dashboard) */}
          <section className="about-section">
            <h2 className="section-title">Tentang Website Ini</h2>
            <div className="prose">
              {content.websiteDescription.split("\n").filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div className="feature-list">
              {[
                { title: "Informasi Kelas", desc: "Identitas dan data dasar kelas yang dapat diakses publik." },
                { title: "Daftar Anggota", desc: "Seluruh anggota kelas dengan fitur pencarian sederhana." },
                { title: "Galeri Kegiatan", desc: "Dokumentasi foto kegiatan dengan moderasi dan penyimpanan durabel." },
                { title: "Struktur Organisasi", desc: "Susunan pengurus kelas secara visual dan tabel." },
              ].map((f) => (
                <div key={f.title} className="feature-item">
                  <p className="feature-title">{f.title}</p>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* KONTAK (catatan editable via dashboard) */}
          <section className="about-section">
            <h2 className="section-title">Kontak</h2>
            <div className="prose">
              <p>
                Untuk pertanyaan atau keperluan lebih lanjut, hubungi wali
                kelas atau pengurus kelas secara langsung melalui sekolah.
              </p>
            </div>
            <div className="contact-note">
              <p className="contact-note-text">{content.contactNote}</p>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
        }

        .page-header {
          padding: 2.5rem 0 2rem;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-alt);
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-bottom: 1rem;
        }

        .breadcrumb-link {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          text-decoration: none;
          transition: color 0.15s;
        }

        .breadcrumb-link:hover { color: var(--color-text); }
        .breadcrumb-sep { font-size: 0.8rem; color: var(--color-text-subtle); }

        .breadcrumb-current {
          font-size: 0.8rem;
          color: var(--color-text);
          font-weight: 500;
        }

        .page-title {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--color-text);
          margin-bottom: 0.5rem;
        }

        .page-desc {
          font-size: 0.925rem;
          color: var(--color-text-muted);
          line-height: 1.6;
        }

        .page-body {
          padding-top: 3rem;
          padding-bottom: 5rem;
        }

        .about-layout {
          max-width: 720px;
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .about-section {
          padding-bottom: 3rem;
          border-bottom: 1px solid var(--color-border-light);
        }

        .about-section:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .section-title {
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          color: var(--color-text);
          margin-bottom: 1.25rem;
        }

        /* INFO LIST */
        .info-list {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--color-surface);
        }

        .info-row {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 1rem;
          padding: 0.875rem 1.25rem;
          border-bottom: 1px solid var(--color-border-light);
        }

        .info-row:last-child { border-bottom: none; }

        .info-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-text-muted);
        }

        .info-value {
          font-size: 0.875rem;
          color: var(--color-text);
          font-weight: 500;
        }

        /* PROSE */
        .prose {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .prose p {
          font-size: 0.925rem;
          color: var(--color-text-muted);
          line-height: 1.8;
        }

        /* FEATURES */
        .feature-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }

        .feature-item {
          padding: 1rem 1.25rem;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          background: var(--color-surface);
        }

        .feature-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 0.25rem;
        }

        .feature-desc {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          line-height: 1.6;
        }

        /* CONTACT */
        .contact-note {
          margin-top: 1rem;
          padding: 1rem 1.25rem;
          background: var(--color-bg-alt);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
        }

        .contact-note-text {
          font-size: 0.825rem;
          color: var(--color-text-muted);
          font-style: italic;
        }

        @media (min-width: 640px) {
          .feature-list {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 768px) {
          .container { padding: 0 2rem; }
          .page-header { padding: 3rem 0 2.5rem; }
        }

        @media (min-width: 1280px) {
          .container { padding: 0 2.5rem; }
        }
      `}</style>
    </PublicLayout>
  );
}
