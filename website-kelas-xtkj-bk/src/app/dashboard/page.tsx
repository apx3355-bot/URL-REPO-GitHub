import { Suspense } from "react";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getQuotaStatus } from "@/lib/settings";
import AcademicSummary from "./AcademicSummary";
import DeveloperDashboard from "./DeveloperDashboard";
import WaliKelasDashboard from "./WaliKelasDashboard";
import AnggotaDashboard from "./AnggotaDashboard";

export const dynamic = "force-dynamic";

// MAINTENANCE audit performa: seluruh query dashboard dijalankan DALAM SATU
// putaran paralel (sebelumnya 3 putaran berurutan + putaran role) — setiap
// round-trip ke Supabase berbiaya ratusan ms dari serverless, jadi
// serialisasi kecil pun terasa di mobile. AcademicSummary dibungkus Suspense
// agar shell dashboard terkirim lebih dulu (streaming) tanpa menunggu
// query akademik.
export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const isDev = user.role === "DEVELOPER";
  const isWali = user.role === "WALI_KELAS";

  const [
    memberCount,
    announcementCount,
    scheduleCount,
    structureCount,
    latestAnnouncements,
    schedules,
    recentLogs,
    totalUsers,
    totalMurid,
    totalWali,
    totalDeveloper,
    pendingGallery,
    quota,
  ] = await Promise.all([
    prisma.classMember.count(),
    prisma.announcement.count({ where: { status: "PUBLISHED" } }),
    prisma.schedule.count(),
    prisma.classStructure.count(),
    prisma.announcement.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        author: { select: { profile: { select: { fullName: true } } } },
      },
    }),
    prisma.schedule.findMany({ take: 200 }),
    // Role-specific — hanya benar-benar dieksekusi untuk role terkait
    isDev
      ? prisma.activityLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: { select: { username: true, profile: { select: { fullName: true } } } },
          },
        })
      : Promise.resolve([]),
    isDev ? prisma.user.count() : Promise.resolve(0),
    isDev ? prisma.user.count({ where: { role: "ANGGOTA" } }) : Promise.resolve(0),
    isDev ? prisma.user.count({ where: { role: "WALI_KELAS" } }) : Promise.resolve(0),
    isDev ? prisma.user.count({ where: { role: "DEVELOPER" } }) : Promise.resolve(0),
    isDev || isWali
      ? prisma.galleryItem.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
    isDev ? getQuotaStatus() : Promise.resolve(null),
  ]);

  if (isDev) {
    return (
      <>
        <DeveloperDashboard
          user={user}
          stats={{
            members: memberCount,
            announcements: announcementCount,
            schedules: scheduleCount,
            structure: structureCount,
          }}
          system={{
            totalUsers,
            totalMurid,
            totalWali,
            totalDeveloper,
            pendingGallery,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            quota: quota!,
          }}
          announcements={latestAnnouncements}
          logs={recentLogs}
        />
        <Suspense fallback={<div className="dash-section" /> }>
          <AcademicSummary role={user.role} userId={user.id} />
        </Suspense>
      </>
    );
  }

  if (isWali) {
    // Wali Kelas juga memoderasi galeri (matrix gallery:moderate)
    return (
      <>
        <WaliKelasDashboard
          user={user}
          stats={{
            members: memberCount,
            announcements: announcementCount,
            schedules: scheduleCount,
            pendingGallery,
          }}
          announcements={latestAnnouncements}
          schedules={schedules}
        />
        <Suspense fallback={<div className="dash-section" />}>
          <AcademicSummary role={user.role} userId={user.id} />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <AnggotaDashboard
        user={user}
        announcements={latestAnnouncements}
        schedules={schedules}
        structureCount={structureCount}
      />
      <Suspense fallback={<div className="dash-section" />}>
        <AcademicSummary role={user.role} userId={user.id} />
      </Suspense>
    </>
  );
}
