import Link from "next/link";
import PublicLayout from "@/components/PublicLayout";
import SectionHeading from "@/components/SectionHeading";
import SystemStatus from "@/components/SystemStatus";
import Reveal from "@/components/home/Reveal";
import HeroBrand from "@/components/home/HeroBrand";
import MemberCarousel from "@/components/home/MemberCarousel";
import NetworkBackground from "@/components/home/NetworkBackground";
import HomeGallery from "@/components/home/HomeGallery";
import { BrandMark } from "@/components/Icons";
import { getClassInfo, getEditableContent } from "@/data/classInfo";
import { prisma } from "@/lib/prisma";
import type { ClassMember } from "@/types";
import type { ViewerPhoto } from "@/components/home/PhotoViewer";

export const dynamic = "force-dynamic";

// ==== Data anggota dari DB (ClassMember — sistem anggota existing) ====
// Fallback statis site hanya bila DB kosong/gagal (pola sama dengan
// /anggota & /struktur — fallback BUKAN profil palsu baru).
async function getMembers(): Promise<ClassMember[]> {
  try {
    const rows = await prisma.classMember.findMany({
      orderBy: [{ position: { sort: "desc", nulls: "last" } }, { fullName: "asc" }],
      take: 60,
      include: {
        user: { select: { profile: { select: { fullName: true, photo: true } } } },
      },
    });
    if (rows.length === 0) return [];
    return rows.map((r) => ({
      id: r.id,
      name: r.fullName,
      photo: r.photo ?? r.user?.profile?.photo ?? null,
      position: r.position,
    }));
  } catch {
    return [];
  }
}

// ==== Data galeri dari DB (GalleryItem APPROVED — sistem galeri Phase 5) ====
// Hanya foto yang sudah dimoderasi APPROVED yang tampil publik (RLS/policy
// permission tidak berubah). Tidak ada sumber foto kedua.
async function getGalleryPhotos(): Promise<ViewerPhoto[]> {
  try {
    const items = await prisma.galleryItem.findMany({
      where: { status: "APPROVED" },
      orderBy: { approvedAt: "desc" },
      take: 60,
    });
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      // Data URL (upload serverless) → serve via endpoint agar HTML ramping
      image: item.imagePath.startsWith("data:")
        ? `/api/gallery/image/${item.id}`
        : item.imagePath,
      date: item.approvedAt?.toISOString() ?? item.createdAt.toISOString(),
      description: item.description ?? undefined,
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  // Maintenance V0.1 — identitas & jumlah anggota dari Settings (SSOT);
  // konten editorial (deskripsi kelas/website) dari Setting editable.
  const [dbMembers, photos, info, content] = await Promise.all([
    getMembers(),
    getGalleryPhotos(),
    getClassInfo(),
    getEditableContent(),
  ]);

  // Member slider: data DB; jika DB kosong → tampilkan 0 kartu dengan
  // pesan fallback (bukan membuat profil palsu).
  const members = dbMembers;
  // Nama kelas dinamis — kata terakhir diberi aksen warna (pola brand existing)
  const nameWords = info.name.split(" ").filter(Boolean);
  const accentWord = nameWords.length > 1 ? nameWords[nameWords.length - 1] : null;
  const headWords = accentWord ? nameWords.slice(0, -1) : nameWords;

  return (
    <PublicLayout>
      {/* HERO — identitas TKJ */}
      <section className="hero">
        {/* Network background animasi (canvas, pause offscreen, reduced-motion statis) */}
        <NetworkBackground />

        <div className="container hero-container">
          <div className="hero-content">
            {/* Hero brand animasi (entrance + idle + parallax) — Phase 13 */}
            <div className="hx-hero-row">
              <HeroBrand />
              <div className="hx-hero-text hx-enter" style={{ animationDelay: "0.1s" }}>
                <p className="hero-label">Tahun Ajaran {info.tahunAjaran}</p>
                <h1 className="hero-title hx-enter" style={{ animationDelay: "0.18s", opacity: 0 }}>
                  {headWords.join(" ")}{headWords.length > 0 ? " " : ""}
                  {accentWord ? <span className="hero-accent">{accentWord}</span> : null}
                </h1>
              </div>
            </div>
            <p className="hero-jurusan hx-enter" style={{ animationDelay: "0.26s", opacity: 0 }}>
              {info.jurusan}
            </p>
            <p className="hero-tagline hx-enter" style={{ animationDelay: "0.32s", opacity: 0 }} aria-label="Tagline kelas">
              &ldquo;Connect. Configure. Create.&rdquo;
            </p>
            <p className="hero-description hx-enter" style={{ animationDelay: "0.38s", opacity: 0 }}>
              Tempat kami belajar jaringan, sistem komputer, dan teknologi —
              berkembang bersama sebagai satu kelas. Kenali anggota, lihat
              aktivitas, dan ikuti perjalanan kami.
            </p>
            <div className="hero-cta hx-enter" style={{ animationDelay: "0.44s", opacity: 0 }}>
              <Link href="/anggota" className="btn-primary" aria-label="Masuk website — lihat daftar anggota kelas">
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
      <Reveal as="section" className="section section--alt">
        <div className="container">
          <SectionHeading
            label="Identitas Kelas"
            title="Snapshot Kelas"
            description="Informasi dasar kelas X TKJ BK tahun ajaran berjalan."
          />
          <div className="snapshot-grid">
            {[
              { label: "Nama Kelas", value: info.name },
              { label: "Jurusan", value: info.jurusan },
              { label: "Wali Kelas", value: info.waliKelas },
              { label: "Tahun Ajaran", value: info.tahunAjaran },
              { label: "Jumlah Anggota", value: `${info.totalAnggota} siswa` },
              { label: "Sekolah", value: info.sekolah },
            ].map((item) => (
              <div key={item.label} className="snapshot-item">
                <span className="snapshot-label">{item.label}</span>
                <span className="snapshot-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* MEMBER — Stacked Profile Slider (data DB) */}
      <Reveal as="section" className="section">
        <div className="container">
          <SectionHeading
            label="Anggota Kelas"
            title="Kenali Warga Kelas"
            description={
              members.length > 0
                ? `${members.length} anggota terdaftar — geser untuk melihat satu per satu.`
                : "Daftar anggota kelas."
            }
          />
          {members.length > 0 ? (
            <MemberCarousel members={members} />
          ) : (
            <div className="hx-empty-gallery">
              <strong>Belum ada data anggota</strong>
              Daftar anggota akan tampil di sini setelah data kelas diisi.
            </div>
          )}
          <div className="section-footer">
            <Link href="/anggota" className="link-more">
              Lihat Semua Anggota →
            </Link>
          </div>
        </div>
      </Reveal>

      {/* CLASS GALLERY + ALL PHOTOS (sistem galeri Phase 5 — APPROVED saja) */}
      <Reveal as="section" className="section section--alt">
        <div className="container">
          <SectionHeading
            label="Dokumentasi"
            title="Galeri Kegiatan"
            description="Momen dan kegiatan kelas yang terdokumentasi."
          />
          {photos.length > 0 ? (
            <HomeGallery photos={photos} />
          ) : (
            <div className="hx-empty-gallery">
              <strong>Belum ada foto</strong>
              Foto kegiatan kelas akan tampil di sini setelah diunggah dan
              disetujui moderator.
            </div>
          )}
          <div className="section-footer">
            <Link href="/galeri" className="link-more">
              Lihat Semua Galeri →
            </Link>
          </div>
        </div>
      </Reveal>

      {/* TENTANG SINGKAT */}
      <Reveal as="section" className="section">
        <div className="container">
          <div className="about-strip">
            <div className="about-strip-text">
              <SectionHeading
                label="Tentang Kelas"
                title={`Siapa Kelas ${info.name}?`}
              />
              <p className="about-body">{content.classDescription}</p>
              <p className="about-body">{content.websiteDescription}</p>
              <Link href="/tentang" className="btn-outline" style={{ marginTop: "1.5rem", display: "inline-block" }}>
                Baca Selengkapnya
              </Link>
            </div>
            <div className="about-strip-visual">
              <div className="about-visual-block">
                <span className="about-visual-number">{info.totalAnggota}</span>
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
      </Reveal>

      {/* STRUKTUR SINGKAT (ringkas — data struktur existing) */}
      <Reveal as="section" className="section section--alt">
        <div className="container">
          <div className="about-strip about-strip--brand">
            <div>
              <div className="hx-hero-row" style={{ marginBottom: "0.75rem" }}>
                <BrandMark size={44} />
              </div>
              <SectionHeading
                label="Struktur"
                title="Pengurus Kelas"
                description="Susunan pengurus organisasi kelas tersedia pada halaman struktur."
              />
              <Link href="/struktur" className="link-more">
                Lihat Struktur Lengkap →
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

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

        /* Network background animasi — di belakang seluruh konten hero */
        .hx-net-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }

        /* Hero content selalu di atas background animasi */
        .hero-container {
          position: relative;
          z-index: 1;
        }

        .hero-content {
          max-width: 640px;
        }

        .hx-hero-row {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          margin-bottom: 1.25rem;
        }

        .hero-label {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--color-text-subtle);
          margin-bottom: 0.35rem;
        }

        .hero-title {
          font-size: clamp(2.5rem, 7vw, 4.25rem);
          font-weight: 800;
          letter-spacing: -0.045em;
          line-height: 1.05;
          color: var(--color-text);
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

        /* ALL PHOTOS head */
        .hx-allphotos {
          margin-top: 2.5rem;
        }

        .hx-allphotos-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .hx-allphotos-title {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--color-text);
        }

        .hx-allphotos-count {
          font-size: 0.75rem;
          color: var(--color-text-subtle);
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

          .about-strip {
            grid-template-columns: 1fr 1fr;
            align-items: start;
          }
        }

        @media (min-width: 1024px) {
          .container {
            padding: 0 2rem;
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
