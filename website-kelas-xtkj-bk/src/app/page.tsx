import Link from "next/link";
import PublicLayout from "@/components/PublicLayout";
import SectionHeading from "@/components/SectionHeading";
import MemberAvatar from "@/components/MemberAvatar";
import GalleryPlaceholder from "@/components/GalleryPlaceholder";
import SystemStatus from "@/components/SystemStatus";
import { BrandMark } from "@/components/Icons";
import { classInfo } from "@/data/classInfo";
import { classStructure } from "@/data/classStructure";
import { classMembers } from "@/data/classMembers";
import { galleryItems } from "@/data/gallery";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const keyStructure = classStructure.filter((s) =>
    ["teacher", "leader", "deputy", "secretary", "treasurer"].includes(s.tier)
  );
  const previewMembers = classMembers.slice(0, 8);
  const previewGallery = galleryItems.slice(0, 5);

  return (
    <PublicLayout>
      {/* HERO — identitas TKJ */}
      <section className="hero">
        {/* Network pattern dekoratif — aria-hidden, subtle */}
        <svg
          className="hero-network"
          aria-hidden="true"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Connection lines */}
          <g stroke="var(--color-accent)" strokeOpacity="0.14" strokeWidth="1">
            <path d="M80 60 L240 140 M240 140 L420 70 M420 70 L610 150 M240 140 L380 260 M610 150 L700 60 M610 150 L680 300 M380 260 L560 320 M80 60 L140 220 M140 220 L380 260 M560 320 L680 300" />
          </g>
          {/* Nodes */}
          <g>
            {[
              [80, 60], [240, 140], [420, 70], [610, 150], [700, 60],
              [380, 260], [560, 320], [680, 300], [140, 220],
            ].map(([cx, cy], i) => (
              <g key={i}>
                <circle cx={cx} cy={cy} r="24" fill="url(#nodeGlow)" opacity="0.35" />
                <circle cx={cx} cy={cy} r="3.5" fill="var(--color-accent)" opacity="0.7" />
                <circle cx={cx} cy={cy} r="8" fill="none" stroke="var(--color-accent)" strokeOpacity="0.25" />
              </g>
            ))}
          </g>
          {/* Digital grid */}
          <g stroke="var(--color-text)" strokeOpacity="0.04">
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="400" />
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 100} x2="800" y2={i * 100} />
            ))}
          </g>
        </svg>

        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-brand">
              <BrandMark size={56} />
              <p className="hero-label">Kelas {classInfo.tahunAjaran}</p>
            </div>
            <h1 className="hero-title">
              X TKJ <span className="hero-accent">BK</span>
            </h1>
            <p className="hero-jurusan">Teknik Komputer dan Jaringan</p>
            <p className="hero-tagline" aria-label="Tagline kelas">
              &ldquo;Connect. Configure. Create.&rdquo;
            </p>
            <p className="hero-description">
              Tempat kami belajar jaringan, sistem komputer, dan teknologi —
              berkembang bersama sebagai satu kelas. Kenali anggota, lihat
              aktivitas, dan ikuti perjalanan kami.
            </p>
            <div className="hero-cta">
              <Link href="/anggota" className="btn-primary">
                Masuk Website
              </Link>
              <Link href="/tentang" className="btn-secondary">
                Lihat Profil Kelas
              </Link>
            </div>
            <SystemStatus />
          </div>
        </div>
      </section>

      {/* CLASS SNAPSHOT */}
      <section className="section section--alt">
        <div className="container">
          <SectionHeading
            label="Identitas Kelas"
            title="Snapshot Kelas"
            description="Informasi dasar kelas X TKJ BK tahun ajaran berjalan."
          />
          <div className="snapshot-grid">
            {[
              { label: "Nama Kelas", value: classInfo.name },
              { label: "Jurusan", value: classInfo.jurusan },
              { label: "Wali Kelas", value: classInfo.waliKelas },
              { label: "Tahun Ajaran", value: classInfo.tahunAjaran },
              { label: "Jumlah Anggota", value: `${classInfo.totalAnggota} siswa` },
              { label: "Sekolah", value: classInfo.sekolah },
            ].map((item) => (
              <div key={item.label} className="snapshot-item">
                <span className="snapshot-label">{item.label}</span>
                <span className="snapshot-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STRUKTUR SINGKAT */}
      <section className="section">
        <div className="container">
          <SectionHeading
            label="Pengurus Kelas"
            title="Struktur Singkat"
            description="Posisi-posisi utama yang menjalankan roda kelas."
          />
          <div className="structure-preview-grid">
            {keyStructure.map((person) => (
              <div key={person.id} className="structure-card">
                <MemberAvatar name={person.name} size="lg" />
                <div className="structure-card-info">
                  <p className="structure-card-name">{person.name}</p>
                  <p className="structure-card-position">{person.position}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="section-footer">
            <Link href="/struktur" className="link-more">
              Lihat Struktur Lengkap →
            </Link>
          </div>
        </div>
      </section>

      {/* ANGGOTA PREVIEW */}
      <section className="section section--alt">
        <div className="container">
          <SectionHeading
            label="Anggota Kelas"
            title="Warga Kelas Kami"
            description={`${classInfo.totalAnggota} siswa yang belajar dan tumbuh bersama di kelas ini.`}
          />
          <div className="members-preview-grid">
            {previewMembers.map((member) => (
              <div key={member.id} className="member-preview-card">
                <MemberAvatar name={member.name} size="md" />
                <div className="member-preview-info">
                  <p className="member-preview-name">{member.name}</p>
                  {member.position && (
                    <p className="member-preview-position">{member.position}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="section-footer">
            <Link href="/anggota" className="link-more">
              Lihat Semua Anggota ({classInfo.totalAnggota}) →
            </Link>
          </div>
        </div>
      </section>

      {/* GALERI PREVIEW */}
      <section className="section">
        <div className="container">
          <SectionHeading
            label="Dokumentasi"
            title="Galeri Kegiatan"
            description="Momen dan kegiatan kelas yang terdokumentasi."
          />
          <div className="gallery-preview-grid">
            {previewGallery.map((item, i) => (
              <div
                key={item.id}
                className={`gallery-preview-item ${i === 0 ? "gallery-preview-item--featured" : ""}`}
              >
                <GalleryPlaceholder
                  title={item.title}
                  category={item.category}
                  index={i}
                />
                <div className="gallery-preview-caption">
                  <span className="gallery-category-tag">{item.category}</span>
                  <p className="gallery-preview-title">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="section-footer">
            <Link href="/galeri" className="link-more">
              Lihat Semua Galeri →
            </Link>
          </div>
        </div>
      </section>

      {/* TENTANG SINGKAT */}
      <section className="section section--alt">
        <div className="container">
          <div className="about-strip">
            <div className="about-strip-text">
              <SectionHeading
                label="Tentang Kelas"
                title="Siapa Kelas X TKJ BK?"
              />
              <p className="about-body">
                Kelas X TKJ BK adalah bagian dari program keahlian Teknik
                Komputer dan Jaringan. Di sini, kami belajar tentang
                infrastruktur jaringan, instalasi sistem, dan berbagai
                keterampilan teknis yang dibutuhkan di dunia kerja maupun
                pendidikan lanjutan.
              </p>
              <p className="about-body">
                Website ini dibangun untuk memudahkan informasi kelas — dari
                daftar anggota, struktur organisasi, hingga dokumentasi
                kegiatan — dapat diakses oleh semua pihak yang berkepentingan.
              </p>
              <Link href="/tentang" className="btn-outline" style={{ marginTop: "1.5rem", display: "inline-block" }}>
                Baca Selengkapnya
              </Link>
            </div>
            <div className="about-strip-visual">
              <div className="about-visual-block">
                <span className="about-visual-number">{classInfo.totalAnggota}</span>
                <span className="about-visual-label">Siswa aktif</span>
              </div>
              <div className="about-visual-block">
                <span className="about-visual-number">1</span>
                <span className="about-visual-label">Tahun ajaran</span>
              </div>
              <div className="about-visual-block">
                <span className="about-visual-number">TKJ</span>
                <span className="about-visual-label">Program keahlian</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.25rem;
        }

        /* HERO */
        .hero {
          position: relative;
          padding: 4rem 0 3.5rem;
          border-bottom: 1px solid var(--color-border);
          overflow: hidden;
          background:
            radial-gradient(ellipse 80% 60% at 70% 20%, var(--color-accent-soft), transparent),
            var(--color-background);
        }

        .hero-network {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .hero-container {
          position: relative;
        }

        .hero-content {
          max-width: 640px;
        }

        .hero-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .hero-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--color-text-subtle);
        }

        .hero-title {
          font-size: clamp(2.5rem, 7vw, 4.25rem);
          font-weight: 800;
          letter-spacing: -0.045em;
          line-height: 1.05;
          color: var(--color-text);
          margin-bottom: 0.5rem;
        }

        .hero-accent {
          color: var(--color-accent);
        }

        .hero-jurusan {
          font-size: clamp(0.95rem, 2vw, 1.15rem);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--color-primary);
          margin-bottom: 0.75rem;
        }

        .hero-tagline {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-accent);
          margin-bottom: 1.25rem;
        }

        .hero-description {
          font-size: 1rem;
          color: var(--color-text-muted);
          line-height: 1.75;
          margin-bottom: 2rem;
          max-width: 480px;
        }

        .hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }

        .btn-primary {
          display: inline-block;
          padding: 0.625rem 1.25rem;
          background: var(--color-primary);
          color: white;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 550;
          transition: background 0.15s, transform 0.15s;
        }

        .btn-primary:hover {
          background: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        .btn-secondary {
          display: inline-block;
          padding: 0.625rem 1.25rem;
          background: transparent;
          color: var(--color-text);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 550;
          border: 1px solid var(--color-border);
          transition: border-color 0.15s, color 0.15s, transform 0.15s;
        }

        .btn-secondary:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
          transform: translateY(-1px);
        }

        .btn-outline {
          display: inline-block;
          padding: 0.625rem 1.25rem;
          background: transparent;
          color: var(--color-text);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 550;
          border: 1px solid var(--color-border);
          transition: border-color 0.15s, color 0.15s;
        }

        .btn-outline:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        /* SECTIONS */
        .section {
          padding: 4rem 0;
        }

        .section--alt {
          background: var(--color-bg-alt);
        }

        .section-footer {
          margin-top: 2.5rem;
        }

        .link-more {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-accent);
          transition: opacity 0.15s;
        }

        .link-more:hover {
          opacity: 0.75;
        }

        /* SNAPSHOT */
        .snapshot-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--color-surface);
        }

        .snapshot-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--color-border-light);
        }

        .snapshot-item:last-child {
          border-bottom: none;
        }

        .snapshot-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-subtle);
        }

        .snapshot-value {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--color-text);
        }

        /* STRUKTUR */
        .structure-preview-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        .structure-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          transition: border-color 0.15s, transform 0.15s;
        }

        .structure-card:hover {
          border-color: var(--color-accent);
          transform: translateY(-1px);
        }

        .structure-card-info {
          flex: 1;
          min-width: 0;
        }

        .structure-card-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .structure-card-position {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.125rem;
        }

        /* MEMBERS */
        .members-preview-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .member-preview-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
        }

        .member-preview-info {
          min-width: 0;
          flex: 1;
        }

        .member-preview-name {
          font-size: 0.825rem;
          font-weight: 500;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .member-preview-position {
          font-size: 0.7rem;
          color: var(--color-accent);
          margin-top: 0.1rem;
          font-weight: 500;
        }

        /* GALLERY */
        .gallery-preview-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .gallery-preview-item {
          position: relative;
        }

        .gallery-preview-item--featured {
          grid-column: 1 / -1;
        }

        .gallery-preview-item--featured > div:first-child {
          aspect-ratio: 16/7;
        }

        .gallery-preview-caption {
          margin-top: 0.5rem;
        }

        .gallery-category-tag {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-subtle);
        }

        .gallery-preview-title {
          font-size: 0.825rem;
          font-weight: 500;
          color: var(--color-text);
          margin-top: 0.125rem;
        }

        /* ABOUT */
        .about-strip {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
        }

        .about-body {
          font-size: 0.925rem;
          color: var(--color-text-muted);
          line-height: 1.8;
          margin-top: 1rem;
        }

        .about-strip-visual {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .about-visual-block {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1.25rem 1.5rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          min-width: 100px;
          flex: 1;
        }

        .about-visual-number {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--color-text);
        }

        .about-visual-label {
          font-size: 0.7rem;
          color: var(--color-text-subtle);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 500;
        }

        /* RESPONSIVE */
        @media (min-width: 640px) {
          .snapshot-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .snapshot-item {
            border-right: 1px solid var(--color-border-light);
            border-bottom: 1px solid var(--color-border-light);
          }

          .snapshot-item:nth-child(2n) {
            border-right: none;
          }

          .snapshot-item:nth-last-child(-n+2) {
            border-bottom: none;
          }

          .structure-preview-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .members-preview-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .gallery-preview-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .gallery-preview-item--featured {
            grid-column: 1 / 3;
          }
        }

        @media (min-width: 768px) {
          .hero {
            padding: 6rem 0 5rem;
          }

          .hero-description {
            font-size: 1.05rem;
          }

          .snapshot-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .snapshot-item:nth-child(2n) {
            border-right: 1px solid var(--color-border-light);
          }

          .snapshot-item:nth-child(3n) {
            border-right: none;
          }

          .snapshot-item:nth-last-child(-n+3) {
            border-bottom: none;
          }

          .snapshot-item:nth-last-child(-n+2) {
            border-bottom: 1px solid var(--color-border-light);
          }

          .structure-preview-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .members-preview-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .about-strip {
            grid-template-columns: 1fr 1fr;
            align-items: start;
          }
        }

        @media (min-width: 1024px) {
          .container {
            padding: 0 2rem;
          }

          .structure-preview-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .members-preview-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (min-width: 1280px) {
          .container {
            padding: 0 2.5rem;
          }
        }
      `}</style>
    </PublicLayout>
  );
}
