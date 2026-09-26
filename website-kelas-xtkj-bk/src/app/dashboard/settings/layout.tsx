import { getSessionUser } from "@/lib/session";
import { can } from "@/lib/roles";
import { redirect } from "next/navigation";

// Maintenance V0.1 — gate server-side: halaman Settings hanya untuk role
// dengan settings.read (Developer & Wali Kelas). API sudah 403, layout ini
// mencegah shell halaman terbuka untuk role lain (layout x-invoke-path lama
// tidak pernah aktif di Next 15).
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard/settings");
  if (!can(user.role, "settings", "read")) redirect("/dashboard");
  return <>{children}</>;
}
