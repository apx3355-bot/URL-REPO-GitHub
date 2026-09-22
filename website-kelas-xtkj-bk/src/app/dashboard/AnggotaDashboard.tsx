import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { DashCSS, WelcomeHeader, StatGrid, SectionTitle, formatDate } from "@/components/dashboard/SharedUI";

interface Props {
  user: SessionUser;
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
  structureCount: number;
}

const DAYS = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const dayNames: Record<string, string> = {
  SENIN: "Senin", SELASA: "Selasa", RABU: "Rabu",
  KAMIS: "Kamis", JUMAT: "Jumat", SABTU: "Sabtu",
};

export default function AnggotaDashboard({ user, announcements, schedules, structureCount }: Props) {
  const todayIdx = (new Date().getDay() + 6) % 7;
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
          { label: "Pengumuman Aktif", value: announcements.length },
          { label: "Jadwal Hari Ini", value: todaySchedules.length },
          { label: "Pengurus Terdaftar", value: structureCount },
        ]}
      />

      <div className="dash-section">
        <SectionTitle>Jadwal Hari Ini ({dayNames[todayKey] ?? "—"})</SectionTitle>
        {todaySchedules.length === 0 ? (
          <div className="dash-empty">Tidak ada jadwal hari ini. Selamat beristirahat!</div>
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

      <div className="dash-section">
        <SectionTitle>Info Kelas</SectionTitle>
        <div className="dash-list">
          <Link href="/struktur" className="dash-item dash-item-link">
            <div className="dash-item-title">Struktur Kelas →</div>
            <div className="dash-item-desc">Lihat susunan pengurus kelas.</div>
          </Link>
          <Link href="/dashboard/profile" className="dash-item dash-item-link">
            <div className="dash-item-title">Profil Saya →</div>
            <div className="dash-item-desc">Perbarui nama, kontak, dan bio Anda.</div>
          </Link>
        </div>
      </div>

      <style>{`
        .dash-item-link { transition: border-color 0.15s; display: block; }
        .dash-item-link:hover { border-color: var(--color-text-muted); }
      `}</style>
    </div>
  );
}
