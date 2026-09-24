import { prisma } from "@/lib/prisma";
import { DashCSS, SectionTitle } from "@/components/dashboard/SharedUI";
import type { Role } from "@/lib/roles";

// Ringkasan akademik (Phase 12) — dirender server di bawah dashboard role.
// Semua angka dihitung dari database nyata, tanpa data dummy.
export default async function AcademicSummary({
  role,
  userId,
}: {
  role: Role;
  userId: number;
}) {
  const now = new Date();

  const [activeAssignments, materialCount] = await Promise.all([
    prisma.assignment.findMany({
      where: { status: "PUBLISHED", dueDate: { gte: now } },
      orderBy: { dueDate: "asc" },
      take: 3,
      select: { id: true, title: true, dueDate: true },
    }),
    prisma.material.count({ where: { status: "PUBLISHED" } }),
  ]);

  let stats: { label: string; value: number | string }[] = [];
  let extra: React.ReactNode = null;

  if (role === "ANGGOTA") {
    const [mySubs, myGraded] = await Promise.all([
      prisma.submission.findMany({
        where: { studentId: userId },
        select: { assignmentId: true },
      }),
      prisma.submission.findMany({
        where: { studentId: userId, grade: { not: null } },
        orderBy: { gradedAt: "desc" },
        take: 3,
        select: {
          grade: true,
          assignment: { select: { title: true } },
          gradedAt: true,
        },
      }),
    ]);
    const submittedIds = new Set(mySubs.map((s) => s.assignmentId));
    const pending = activeAssignments.filter((a) => !submittedIds.has(a.id));

    stats = [
      { label: "Tugas Aktif", value: activeAssignments.length },
      { label: "Belum Dikumpulkan", value: pending.length },
      { label: "Materi Tersedia", value: materialCount },
      { label: "Sudah Dinilai", value: myGraded.length },
    ];

    extra = (
      <div className="ac grid-2col">
        <div>
          <p className="ac-subhead">Deadline Terdekat</p>
          {activeAssignments.length === 0 ? (
            <p className="ac-empty">Tidak ada tugas aktif.</p>
          ) : (
            <ul className="ac-list">
              {activeAssignments.map((a) => (
                <li key={a.id}>
                  <span className="ac-item-title">{a.title}</span>
                  <span className="ac-item-meta">
                    {a.dueDate.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    {a.dueDate.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="ac-subhead">Nilai Terbaru</p>
          {myGraded.length === 0 ? (
            <p className="ac-empty">Belum ada nilai.</p>
          ) : (
            <ul className="ac-list">
              {myGraded.map((s, i) => (
                <li key={i}>
                  <span className="ac-item-title">{s.assignment.title}</span>
                  <span className="ac-grade">{s.grade}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  } else {
    // WALI_KELAS & DEVELOPER: pandangan pengelola
    const [totalSubs, ungraded] = await Promise.all([
      prisma.submission.count(),
      prisma.submission.count({ where: { gradedAt: null } }),
    ]);
    const assignmentCount = await prisma.assignment.count();

    stats = [
      { label: "Total Tugas", value: assignmentCount },
      { label: "Tugas Aktif", value: activeAssignments.length },
      { label: "Submission Masuk", value: totalSubs },
      { label: "Belum Dinilai", value: ungraded },
    ];

    extra = (
      <div>
        <p className="ac-subhead">Deadline Terdekat</p>
        {activeAssignments.length === 0 ? (
          <p className="ac-empty">Tidak ada tugas aktif.</p>
        ) : (
          <ul className="ac-list">
            {activeAssignments.map((a) => (
              <li key={a.id}>
                <span className="ac-item-title">{a.title}</span>
                <span className="ac-item-meta">
                  {a.dueDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <section className="dash-section">
      <SectionTitle>Ringkasan Akademik</SectionTitle>
      <div className="dash-card">
        <div className="ac-stats">
          {stats.map((s) => (
            <div key={s.label} className="ac-stat">
              <span className="ac-stat-value">{s.value}</span>
              <span className="ac-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
        {extra}
      </div>
      <DashCSS />
      <style>{`
        .ac-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .ac-stat {
          display: flex;
          flex-direction: column;
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          background: var(--color-bg-alt);
        }
        .ac-stat-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-text);
          line-height: 1.2;
        }
        .ac-stat-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--color-text-subtle);
        }
        .ac.grid-2col {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        .ac-subhead {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--color-text-subtle);
          margin-bottom: 0.5rem;
        }
        .ac-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .ac-list li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 0.8rem;
        }
        .ac-item-title {
          color: var(--color-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ac-item-meta { color: var(--color-text-subtle); font-size: 0.7rem; white-space: nowrap; }
        .ac-grade {
          font-weight: 700;
          color: var(--color-accent);
          font-size: 0.8rem;
        }
        .ac-empty { font-size: 0.78rem; color: var(--color-text-subtle); }
        @media (min-width: 640px) {
          .ac-stats { grid-template-columns: repeat(4, 1fr); }
          .ac.grid-2col { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </section>
  );
}
