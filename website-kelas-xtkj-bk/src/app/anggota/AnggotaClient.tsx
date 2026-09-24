"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AvatarDisplay from "@/components/AvatarDisplay";
import PublicLayout from "@/components/PublicLayout";
import { classInfo } from "@/data/classInfo";
import type { ClassMember } from "@/types";

export default function AnggotaClient({ members: classMembers }: { members: ClassMember[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classMembers;
    return classMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.position && m.position.toLowerCase().includes(q))
    );
  }, [query]);

  const withPosition = filtered.filter((m) => m.position);
  const regular = filtered.filter((m) => !m.position);

  return (
    <PublicLayout>
      <div className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="breadcrumb-link">Beranda</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Anggota</span>
          </nav>
          <h1 className="page-title">Anggota Kelas</h1>
          <p className="page-desc">
            {classInfo.totalAnggota} siswa kelas {classInfo.name} tahun ajaran {classInfo.tahunAjaran}.
          </p>
        </div>
      </div>

      <div className="container page-body">
        <div className="search-row">
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              className="search-input"
              placeholder="Cari nama atau jabatan..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cari anggota"
            />
            {query && (
              <button
                className="search-clear"
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
              >
                ×
              </button>
            )}
          </div>
          <p className="search-count">
            {query
              ? `${filtered.length} dari ${classMembers.length}`
              : `${classMembers.length} anggota`}
          </p>
        </div>

        {withPosition.length > 0 && (
          <section className="member-section">
            <h2 className="member-section-heading">Pengurus Kelas</h2>
            <div className="member-grid">
              {withPosition.map((member) => (
                <div key={member.id} className="member-card">
                  <AvatarDisplay name={member.name} photo={member.photo} size="xl" />
                  <div className="member-card-body">
                    <p className="member-card-name">{member.name}</p>
                    <p className="member-card-position">{member.position}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {regular.length > 0 && (
          <section className="member-section">
            <h2 className="member-section-heading">
              {query ? "Hasil Pencarian" : "Anggota"}
            </h2>
            <div className="member-grid-regular">
              {regular.map((member) => (
                <div key={member.id} className="member-card-regular">
                  <AvatarDisplay name={member.name} photo={member.photo} size="md" />
                  <p className="member-card-regular-name">{member.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="empty-state">
            <p className="empty-title">Tidak ditemukan</p>
            <p className="empty-desc">
              Tidak ada anggota dengan kata kunci &ldquo;{query}&rdquo;.
            </p>
            <button className="btn-outline" onClick={() => setQuery("")}>
              Tampilkan semua
            </button>
          </div>
        )}
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

        .search-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 2.5rem;
        }

        .search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
          max-width: 380px;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-subtle);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 2.25rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          background: var(--color-surface);
          color: var(--color-text);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .search-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-soft);
        }

        .search-input::placeholder { color: var(--color-text-subtle); }

        .search-clear {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
          color: var(--color-text-subtle);
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .search-clear:hover { color: var(--color-text); }

        .search-count {
          font-size: 0.8rem;
          color: var(--color-text-subtle);
          white-space: nowrap;
        }

        .member-section { margin-bottom: 3rem; }

        .member-section-heading {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-text-subtle);
          margin-bottom: 1.25rem;
          padding-bottom: 0.625rem;
          border-bottom: 1px solid var(--color-border-light);
        }

        .member-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .member-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.875rem;
          padding: 1.5rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          text-align: center;
          transition: border-color 0.15s, transform 0.15s;
        }

        .member-card:hover {
          border-color: var(--color-accent);
          transform: translateY(-1px);
        }

        .member-card-body {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
        }

        .member-card-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .member-card-position {
          font-size: 0.72rem;
          color: var(--color-accent);
          font-weight: 500;
        }

        .member-grid-regular {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.625rem;
        }

        .member-card-regular {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 0.75rem;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          min-width: 0;
          transition: border-color 0.15s;
        }

        .member-card-regular:hover { border-color: var(--color-accent); }

        .member-card-regular-name {
          font-size: 0.8rem;
          color: var(--color-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          font-weight: 500;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 1rem;
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

        @media (min-width: 480px) {
          .member-grid-regular { grid-template-columns: repeat(3, 1fr); }
        }

        @media (min-width: 640px) {
          .member-grid { grid-template-columns: repeat(3, 1fr); }
          .member-grid-regular { grid-template-columns: repeat(4, 1fr); }
        }

        @media (min-width: 768px) {
          .container { padding: 0 2rem; }
          .page-header { padding: 3rem 0 2.5rem; }
          .member-grid { grid-template-columns: repeat(4, 1fr); }
          .member-grid-regular { grid-template-columns: repeat(5, 1fr); }
        }

        @media (min-width: 1024px) {
          .member-grid { grid-template-columns: repeat(4, 1fr); }
          .member-grid-regular { grid-template-columns: repeat(6, 1fr); }
        }

        @media (min-width: 1280px) {
          .container { padding: 0 2.5rem; }
        }
      `}</style>
    </PublicLayout>
  );
}
