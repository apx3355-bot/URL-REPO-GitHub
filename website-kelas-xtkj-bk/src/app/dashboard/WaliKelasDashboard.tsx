import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { DashCSS, WelcomeHeader, StatGrid, SectionTitle, formatDate } from "@/components/dashboard/SharedUI";

interface Props {
  user: SessionUser;
  stats: { members: number; announcements: number; schedules: number };
  announcements: {
    id: number;
    title: string;
    createdAt: Date;
    author: { profile: { fullName: string } | null } | null;
  }[];
  schedules: {
    id: number;
    day: string;
    startTime: string;
    endTime: string;
    subject: string;
    teacher: string | null;
    room: string | null;
  }[];
}

const DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const dayNames: Record<string, string> = {
  SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu",
  KAMIS: "Kamis", JUMAT: "Jumat", SABTU: "Sabtu",
};

const shortcuts = [
  { href: "/dashboard/announcements", label: "Buat Pengumuman", desc: "Beri tahu kelas" },
  { href: "/dashboard/members", label: "Data Anggota", desc: "Lihat & perbarui anggota" },
  { href: "/dashboard/schedules", label: "Kelola Jadwal", desc: "Atur jadwal pelajaran" },
  { href: "/dashboard/profile", label: "Profil Saya", desc: "Perbarui profil akun" },
];

export default function WaliKelasDashboard({ user, stats, announcements, schedules }: Props) {
  // Jadwal hari ini berdasarkan hari server
  const todayIdx = (new Date().getDay() + 6) % 7; // 0 = Senin
  const todayKey = DAYS[todayIdx] ?? "";
  const todaySchedules = schedules
    .filter((s) => s.day === todayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div>
      <DashCSS />
      <WelcomeHeader user={user} />

      <StatGrid
        items={[
          { label: "Anggota Kelas", value: stats.members },
          { label: "Pengumuman Aktif", value: stats.announcements },
          { label: "Item Jadwal", value: stats.schedules },
        ]}
      />

      <div className="dash-section">
        <SectionTitle>Pengelolaan Kelas</SectionTitle>
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
        <SectionTitle>Jadwal Hari Ini ({dayNames[todayKey] ?? "—"})</SectionTitle>
        {todaySchedules.length === 0 ? (
          <div className="dash-empty">Tidak ada jadwal hari ini.</div>
        ) : (
          <div className="dash-list">
            {todaySchedules.map((s) => (
              <div key={s.id} className="dash-item">
                <div className="dash-item-title">
                  {s.startTime}–{s.endTime} · {s.subject}
                </div>
                <div className="dash-item-desc">
                  {[s.teacher, s.room].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
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
                  {a.author?.profile?.fullName ?? "—"} · {formatDate(a.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
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
        @media (min-width: 640px) {
          .shortcut-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>
    </div>
  );
}
