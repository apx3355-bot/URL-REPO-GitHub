import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ROLE_LABELS, can } from "@/lib/roles";
import DashboardShell from "./DashboardShell";

export const metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false }, // noindex — halaman private
};

// Path admin yang butuh permission khusus — dicek server-side, bukan hanya UI.
const PATH_GATES: { prefix: string; resource: string; action: "read" }[] = [
  { prefix: "/dashboard/users", resource: "users", action: "read" },
  { prefix: "/dashboard/activity", resource: "activityLogs", action: "read" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  // Server-side path gate
  const headerList = await headers();
  const pathname = headerList.get("x-invoke-path") ?? "";
  const gate = PATH_GATES.find((g) => pathname.startsWith(g.prefix));
  if (gate && !can(user.role, gate.resource, gate.action)) {
    redirect("/dashboard");
  }

  return (
    <DashboardShell user={user} roleLabel={ROLE_LABELS[user.role]}>
      {children}
    </DashboardShell>
  );
}
