import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/PublicLayout";
import MemberAvatar from "@/components/MemberAvatar";
import { classStructure as staticStructure } from "@/data/classStructure";
import { classInfo } from "@/data/classInfo";
import { prisma } from "@/lib/prisma";
import type { ClassStructure } from "@/types";

export const metadata: Metadata = {
  title: "Struktur Kelas",
  description: `Struktur organisasi kelas ${classInfo.name} — wali kelas, ketua, wakil, sekretaris, dan bendahara.`,
};

export const dynamic = "force-dynamic";

// Ambil struktur dari database; fallback ke data statis jika DB kosong/gagal
async function getStructure(): Promise<ClassStructure[]> {
  try {
    const rows = await prisma.classStructure.findMany({ orderBy: { order: "asc" }, take: 100 });
    if (rows.length === 0) return staticStructure;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      position: r.position,
      photo: r.photo,
      order: r.order,
      tier: r.tier as ClassStructure["tier"],
      description: r.description ?? undefined,
    }));
  } catch {
    return staticStructure;
  }
}

function StructureNode({ person }: { person: ClassStructure }) {
  const tierStyle: Record<ClassStructure["tier"], { bg: string; border: string; label: string }> = {
    teacher: { bg: "var(--color-accent-soft)", border: "var(--color-accent)", label: "Pembimbing" },
    leader: { bg: "var(--color-warning-soft)", border: "var(--color-warning)", label: "Pimpinan" },
    deputy: { bg: "var(--color-success-soft)", border: "var(--color-success)", label: "Pimpinan" },
    secretary: { bg: "var(--color-primary)", border: "var(--color-primary)", label: "Administrasi" },
    treasurer: { bg: "var(--color-warning-soft)", border: "var(--color-warning)", label: "Keuangan" },
    section: { bg: "var(--color-surface)", border: "var(--color-border)", label: "Seksi" },
  };

  const style = tierStyle[person.tier];

  return (
    <div
      className="structure-node"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      <MemberAvatar name={person.name} size="lg" />
      <div className="structure-node-info">
        <p className="structure-node-position">{person.position}</p>
        <p className="structure-node-name">{person.name}</p>
        {person.description && (
          <p className="structure-node-desc">{person.description}</p>
        )}
      </div>
    </div>
  );
}

export default async function StrukturPage() {
  const classStructure = await getStructure();
  const teacher = classStructure.find((s) => s.tier === "teacher");
  const leader = classStructure.find((s) => s.tier === "leader");
  const deputy = classStructure.find((s) => s.tier === "deputy");
  const secretaries = classStructure.filter((s) => s.tier === "secretary");
  const treasurers = classStructure.filter((s) => s.tier === "treasurer");
  const sections = classStructure.filter((s) => s.tier === "section");

  return (
    <PublicLayout>
      <div className="page-header">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="breadcrumb-link">Beranda</Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">Struktur Kelas</span>
          </nav>
          <h1 className="page-title">Struktur Organisasi</h1>
          <p className="page-desc">
            Susunan pengurus dan organisasi kelas {classInfo.name} tahun ajaran {classInfo.tahunAjaran}.
          </p>
        </div>
      </div>

      <div className="container page-body">
        {/* TREE DIAGRAM */}
        <div className="org-tree">
          {/* Wali Kelas */}
          {teacher && (
            <div className="tree-level">
              <div className="tree-level-label">Pembimbing</div>
              <div className="tree-nodes tree-nodes--center">
                <StructureNode person={teacher} />
              </div>
            </div>
          )}

          <div className="tree-connector" aria-hidden="true" />

          {/* Ketua */}
          {leader && (
            <div className="tree-level">
              <div className="tree-level-label">Pimpinan</div>
              <div className="tree-nodes tree-nodes--row">
                <StructureNode person={leader} />
                {deputy && <StructureNode person={deputy} />}
              </div>
            </div>
          )}

          <div className="tree-connector" aria-hidden="true" />

          {/* Sekretaris & Bendahara */}
          {(secretaries.length > 0 || treasurers.length > 0) && (
            <div className="tree-level">
              <div className="tree-level-label">Administrasi & Keuangan</div>
              <div className="tree-nodes tree-nodes--row">
                {secretaries.map((s) => (
                  <StructureNode key={s.id} person={s} />
                ))}
                {treasurers.map((t) => (
                  <StructureNode key={t.id} person={t} />
                ))}
              </div>
            </div>
          )}

          {/* Seksi-seksi */}
          {sections.length > 0 && (
            <>
              <div className="tree-connector" aria-hidden="true" />
              <div className="tree-level">
                <div className="tree-level-label">Seksi-seksi</div>
                <div className="tree-nodes tree-nodes--row">
                  {sections.map((s) => (
                    <StructureNode key={s.id} person={s} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* TABLE VIEW — tambahan untuk aksesibilitas */}
        <div className="structure-table-section">
          <h2 className="structure-table-heading">Daftar Pengurus</h2>
          <div className="structure-table-wrap">
            <table className="structure-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Jabatan</th>
                </tr>
              </thead>
              <tbody>
                {classStructure.map((person, i) => (
                  <tr key={person.id}>
                    <td>{i + 1}</td>
                    <td>
                      <div className="table-member">
                        <MemberAvatar name={person.name} size="sm" />
                        <span>{person.name}</span>
                      </div>
                    </td>
                    <td>{person.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

        .breadcrumb-link:hover {
          color: var(--color-text);
        }

        .breadcrumb-sep {
          font-size: 0.8rem;
          color: var(--color-text-subtle);
        }

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
          padding-bottom: 4rem;
        }

        /* ORG TREE */
        .org-tree {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
          margin-bottom: 4rem;
        }

        .tree-level {
          padding: 1.5rem 0;
        }

        .tree-level-label {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--color-text-subtle);
          margin-bottom: 1rem;
        }

        .tree-connector {
          width: 2px;
          height: 2rem;
          background: var(--color-border);
          margin-left: 1.5rem;
        }

        .tree-nodes {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .tree-nodes--center {
          align-items: flex-start;
        }

        .tree-nodes--row {
          flex-direction: column;
          gap: 0.75rem;
        }

        .structure-node {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-radius: 10px;
          max-width: 360px;
          width: 100%;
        }

        .structure-node-info {
          flex: 1;
          min-width: 0;
        }

        .structure-node-position {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
        }

        .structure-node-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .structure-node-desc {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }

        /* TABLE */
        .structure-table-section {
          margin-top: 2rem;
          padding-top: 2.5rem;
          border-top: 1px solid var(--color-border);
        }

        .structure-table-heading {
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 1.25rem;
          color: var(--color-text);
        }

        .structure-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--color-border);
          border-radius: 8px;
        }

        .structure-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .structure-table th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-text-subtle);
          background: var(--color-bg-alt);
          border-bottom: 1px solid var(--color-border);
        }

        .structure-table td {
          padding: 0.75rem 1rem;
          color: var(--color-text);
          border-bottom: 1px solid var(--color-border-light);
          vertical-align: middle;
        }

        .structure-table tr:last-child td {
          border-bottom: none;
        }

        .structure-table tr:hover td {
          background: var(--color-surface-hover);
        }

        .table-member {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        @media (min-width: 640px) {
          .tree-connector {
            margin-left: 3rem;
          }

          .tree-nodes--row {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .structure-node {
            width: auto;
            flex: 0 0 auto;
            min-width: 240px;
          }
        }

        @media (min-width: 768px) {
          .container {
            padding: 0 2rem;
          }

          .page-header {
            padding: 3rem 0 2.5rem;
          }

          .tree-connector {
            margin-left: 4rem;
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
