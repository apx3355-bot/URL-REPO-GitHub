"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PhotoImg from "@/components/home/PhotoImg";
import type { GalleryCategory, GalleryItem } from "@/types";

const ALL = "Semua";
const categories: (typeof ALL | GalleryCategory)[] = [
  ALL,
  "Kegiatan Kelas",
  "Praktik",
  "Acara Sekolah",
  "Lainnya",
];

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function LightboxModal({
  item,
  onClose,
}: {
  item: GalleryItem;
  onClose: () => void;
}) {
  return (
    <div
      className="lightbox-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={onClose}
    >
      <div
        className="lightbox-inner"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="lightbox-close"
          onClick={onClose}
          aria-label="Tutup"
        >
          ×
        </button>
        <div className="lightbox-image">
          <PhotoImg src={item.image} alt={item.title} eager />
        </div>
        <div className="lightbox-info">
          <span className="lightbox-category">{item.category}</span>
          <h2 className="lightbox-title">{item.title}</h2>
          {item.description && (
            <p className="lightbox-desc">{item.description}</p>
          )}
          <p className="lightbox-date">{formatDate(item.date)}</p>
        </div>
      </div>

      <style>{`
        .lightbox-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .lightbox-inner {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          max-width: 640px;
          width: 100%;
          position: relative;
        }

        .lightbox-close {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0,0,0,0.4);
          color: white;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          cursor: pointer;
          border: none;
          line-height: 1;
        }

        .lightbox-close:hover { background: rgba(0,0,0,0.6); }

        .lightbox-image img,
        .lightbox-image > div {
          width: 100%;
          aspect-ratio: 16/9;
          object-fit: cover;
          display: block;
          border-radius: 0;
        }

        .lightbox-info {
          padding: 1.25rem 1.5rem 1.5rem;
        }

        .lightbox-category {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-text-subtle);
        }

        .lightbox-title {
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-text);
          margin: 0.375rem 0 0.5rem;
        }

        .lightbox-desc {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          line-height: 1.7;
          margin-bottom: 0.75rem;
        }

        .lightbox-date {
          font-size: 0.75rem;
          color: var(--color-text-subtle);
        }
      `}</style>
    </div>
  );
}

export default function GaleriClient({ items: galleryItems }: { items: GalleryItem[] }) {
  const [activeCategory, setActiveCategory] = useState<typeof ALL | GalleryCategory>(ALL);
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);

  const filtered = useMemo(() => {
    if (activeCategory === ALL) return galleryItems;
    return galleryItems.filter((g) => g.category === activeCategory);
  }, [activeCategory, galleryItems]);

  // Tutup lightbox dengan tombol Escape (desktop) — gap Phase 13
  useEffect(() => {
    if (!lightboxItem) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxItem]);

  return (
    <>
      {lightboxItem && (
        <LightboxModal
          item={lightboxItem}
          onClose={() => setLightboxItem(null)}
        />
      )}

      <div className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="breadcrumb-link">Beranda</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Galeri</span>
          </nav>
          <h1 className="page-title">Galeri Kegiatan</h1>
          <p className="page-desc">
            Dokumentasi kegiatan dan momen kelas yang tersimpan di sini.
          </p>
        </div>
      </div>

      <div className="container page-body">
        {/* FILTER */}
        <div className="filter-row" role="group" aria-label="Filter kategori">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${activeCategory === cat ? "filter-btn--active" : ""}`}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* GRID */}
        {filtered.length > 0 ? (
          <div className="gallery-grid">
            {filtered.map((item, i) => (
              <button
                key={item.id}
                className={`gallery-item ${i === 0 && activeCategory === ALL ? "gallery-item--featured" : ""}`}
                onClick={() => setLightboxItem(item)}
                aria-label={`Lihat foto: ${item.title}`}
              >
                <div className="gallery-item-image">
                  <PhotoImg src={item.image} alt={item.title} />
                </div>
                <div className="gallery-item-info">
                  <span className="gallery-item-category">{item.category}</span>
                  <p className="gallery-item-title">{item.title}</p>
                  <p className="gallery-item-date">{formatDate(item.date)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-title">Belum ada foto</p>
            <p className="empty-desc">
              Belum ada foto dalam kategori ini. Foto akan ditambahkan segera.
            </p>
            <button
              className="btn-outline"
              onClick={() => setActiveCategory(ALL)}
            >
              Lihat semua
            </button>
          </div>
        )}

        <p className="gallery-note">
          Foto akan diperbarui secara berkala. Dokumentasi menggunakan penyimpanan cloud pada tahap selanjutnya.
        </p>
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
          padding-top: 2.5rem;
          padding-bottom: 4rem;
        }

        /* FILTER */
        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .filter-btn {
          padding: 0.4rem 0.875rem;
          border: 1px solid var(--color-border);
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--color-text-muted);
          background: var(--color-surface);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }

        .filter-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .filter-btn--active {
          background: var(--color-accent);
          color: #fff;
          border-color: var(--color-accent);
        }

        .filter-btn--active:hover {
          background: var(--color-accent);
          color: #fff;
        }

        /* GALLERY GRID */
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .gallery-item {
          text-align: left;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          border-radius: 8px;
          overflow: hidden;
          transition: transform 0.15s;
        }

        .gallery-item:hover {
          transform: translateY(-2px);
        }

        .gallery-item:hover .gallery-item-image {
          opacity: 0.9;
        }

        .gallery-item--featured {
          grid-column: 1 / -1;
        }

        .gallery-item--featured .gallery-item-image > div {
          aspect-ratio: 16/7;
        }

        .gallery-item-image img,
        .gallery-item-image .hx-photo-broken {
          width: 100%;
          aspect-ratio: 4/3;
          object-fit: cover;
          display: block;
        }

        .gallery-item--featured .gallery-item-image img,
        .gallery-item--featured .gallery-item-image .hx-photo-broken {
          aspect-ratio: 16/7;
        }

        .gallery-item-image {
          border-radius: 8px;
          overflow: hidden;
          transition: opacity 0.15s;
        }

        .gallery-item-image > div {
          border-radius: 8px;
        }

        .gallery-item-info {
          padding: 0.625rem 0.125rem;
        }

        .gallery-item-category {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-subtle);
        }

        .gallery-item-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text);
          margin-top: 0.2rem;
          line-height: 1.3;
        }

        .gallery-item-date {
          font-size: 0.72rem;
          color: var(--color-text-subtle);
          margin-top: 0.2rem;
        }

        /* EMPTY */
        .empty-state {
          text-align: center;
          padding: 5rem 1rem;
        }

        .empty-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 0.5rem;
        }

        .empty-desc {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: 1.5rem;
        }

        .btn-outline {
          display: inline-block;
          padding: 0.625rem 1.25rem;
          background: transparent;
          color: var(--color-text);
          border-radius: 7px;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          border: 1px solid var(--color-border);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }

        .btn-outline:hover {
          border-color: var(--color-text-muted);
          background: var(--color-border-light);
        }

        .gallery-note {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--color-border-light);
          font-size: 0.75rem;
          color: var(--color-text-subtle);
          text-align: center;
        }

        @media (min-width: 640px) {
          .gallery-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .gallery-item--featured {
            grid-column: 1 / 3;
          }
        }

        @media (min-width: 768px) {
          .container { padding: 0 2rem; }
          .page-header { padding: 3rem 0 2.5rem; }

          .gallery-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.25rem;
          }
        }

        @media (min-width: 1024px) {
          .gallery-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .gallery-item--featured {
            grid-column: 1 / 3;
          }
        }

        @media (min-width: 1280px) {
          .container { padding: 0 2.5rem; }
        }
      `}</style>
    </>
  );
}
