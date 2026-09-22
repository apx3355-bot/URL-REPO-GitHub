import { getSessionUser } from "@/lib/session";
import { can } from "@/lib/roles";
import ForbiddenContent from "@/app/forbidden";

// Gate server-side: hanya Developer.
export default async function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  if (!can(user.role, "activityLogs", "read")) {
    return (
      <ForbiddenContent message="Activity Log hanya dapat diakses oleh Developer." />
    );
  }
  return <>{children}</>;
}
