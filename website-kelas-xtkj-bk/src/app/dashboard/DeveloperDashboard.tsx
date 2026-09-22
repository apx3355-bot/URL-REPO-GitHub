import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { DashCSS, WelcomeHeader, StatGrid, SectionTitle, formatDateTime } from "@/components/dashboard/SharedUI";

interface Props {
  user: SessionUser;
  stats: { members: number; announcements: number; schedules: number; structure: number };
  system: {
    totalUsers: number;
    totalMurid: number;
    totalWali: number;
    totalDeveloper: number;
    pendingGallery: number;
    quota: { max: number; registered: number; remaining: number; full: boolean };
  };
  announcements: {
    id: number;
    title: string;
    createdAt: Date;
    author: { profile: { fullName: string } | null } | null;
  }[];
  logs: {
    id: number;
    action: string;
    description: string;
    createdAt: Date;
    user: { username: string; profile: { fullName: string } | null } | null;
  }[];
}

const shortcuts = [
  { href: "/dashboard/users", label: "User Management", desc: "Akun, role, status, reset password" },
  { href: "/dashboard/announcements", label: "Kelola Pengumuman", desc: "Buat, ubah, hapus pengumuman" },
  { href: "/dashboard/members", label: "Kelola Anggota", desc: "Kelola data anggota kelas" },
  { href: "/dashboard/structure", label: "Kelola Struktur", desc: "Susunan organisasi kelas" },
  { href: "/dashboard/schedules", label: "Kelola Jadwal", desc: "Jadwal pelajaran mingguan" },
  { href: "/dashboard/gallery", label: "Moderasi Galeri", desc: "Approve/reject upload murid" },
  { href: "/dashboard/activity", label: "Activity Log", desc: "Riwayat aktivitas sistem" },
  { href: "/dashboard/settings", label: "Settings", desc: "Kuota & konfigurasi website" },
];

export default function DeveloperDashboard({ user, stats, system, announcements, logs }: Props) {
  const quotaPct = Math.min(100, Math.round((system.quota.registered / system.quota.max) * 100));
  return (
    <div>
      <DashCSS />
      <WelcomeHeader user={user} />

      {/* SYSTEM OVERVIEW — statistik user & kuota */}
      <StatGrid
        items={[
          { label: "Total Users", value: system.totalUsers },
          { label: "Murid", value: system.totalMurid },
          { label: "Wali Kelas", value: system.totalWali },
          { label: "Developer", value: system.totalDeveloper },
        ]}
      />

      <StatGrid
        items={[
          { label: "Anggota Kelas", value: stats.members },
          { label: "Pengumuman Aktif", value: stats.announcements },
          { label: "Jadwal", value: stats.schedules },
          { label: "Pending Galeri", value: system.pendingGallery },
        ]}
      />

      {/* MEMBER QUOTA */}
      <div className="dash-section">
        <SectionTitle>Member Quota</SectionTitle>
        <div className="quota-card">
          <div className="quota-nums">
            <div><strong>{system.quota.max}</strong><span>Maximum</span></div>
            <div><strong>{system.quota.registered}</strong><span>Registered</span></div>
            <div><strong>{system.quota.remaining}</strong><span>Remaining</span></div>
            <div>
              <strong className={system.quota.full ? "quota-status quota-status--full" : "quota-status"}>
                {system.quota.full ? "PENUH" : "TERBUKA"}
              </strong>
              <span>Status</span>
            </div>
          </div>
          <div className="quota-bar" role="progressbar" aria-valuenow={quotaPct} aria-valuemin={0} aria-valuemax={100} aria-label="Kuota terpakai">
            <div className={`quota-bar-fill ${system.quota.full ? "quota-bar-fill--full" : ""}`} style={{ width: `${quotaPct}%` }} />
          </div>
          <Link href="/dashboard/settings" className="quota-manage-link">Kelola kuota di Settings →</Link>
        </div>
      </div>

      <div className="dash-section">
        <SectionTitle>Manajemen</SectionTitle>
        <div className="shortcut-grid">
          {shortcuts.map((s) => (
            <Link key={s.href} href={s.href} className="shortcut-card">
              <span className="shortcut-label">{s.label}</span>
              <span className="shortcut-desc">{s.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="dash-section">
        <SectionTitle>Pengumuman Terbaru</SectionTitle>
        {announcements.length === 0 ? (
          <div className="dash-empty">Belum ada pengumuman.</div>
        ) : (
          <div className="dash-list">
            {announcements.map((a) => (
              <div key={a.id} className="dash-item">
                <div className="dash-item-title">{a.title}</div>
                <div className="dash-item-meta">
                  {a.author?.profile?.fullName ?? "—"} · {formatDateTime(a.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dash-section">
        <SectionTitle>Aktivitas Terakhir</SectionTitle>
        {logs.length === 0 ? (
          <div className="dash-empty">Belum ada aktivitas tercatat.</div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aksi</th>
                  <th>Keterangan</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(log.createdAt)}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{log.action}</td>
                    <td>{log.description}</td>
                    <td>{log.user?.profile?.fullName ?? log.user?.username ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ marginTop: "0.75rem" }}>
          <Link href="/dashboard/activity" className="dash-link">
            Lihat semua aktivitas →
          </Link>
        </p>
      </div>

      <style>{`
        .shortcut-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        .shortcut-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1rem 1.125rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          transition: border-color 0.15s, transform 0.15s;
        }
        .shortcut-card:hover { border-color: var(--color-accent); transform: translateY(-1px); }
        .shortcut-label {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--color-text);
        }
        .shortcut-desc {
          font-size: 0.7rem;
          color: var(--color-text-subtle);
        }
        .dash-link {
          font-size: 0.8rem;
          color: var(--color-primary);
        }
        .quota-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 1.125rem 1.25rem;
        }
        .quota-nums {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.875rem;
        }
        .quota-nums > div { display: flex; flex-direction: column; gap: 0.125rem; }
        .quota-nums strong { font-size: 1.1rem; color: var(--color-text); }
        .quota-nums span {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-muted);
        }
        .quota-status { color: var(--color-success); }
        .quota-status--full { color: var(--color-danger); }
        .quota-bar {
          height: 8px;
          border-radius: 999px;
          background: var(--color-border);
          overflow: hidden;
        }
        .quota-bar-fill {
          height: 100%;
          background: var(--color-accent);
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .quota-bar-fill--full { background: var(--color-danger); }
        .quota-manage-link {
          display: inline-block;
          margin-top: 0.75rem;
          font-size: 0.78rem;
          color: var(--color-accent);
        }
        @media (max-width: 560px) {
          .quota-nums { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 640px) {
          .shortcut-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </div>
  );
}
