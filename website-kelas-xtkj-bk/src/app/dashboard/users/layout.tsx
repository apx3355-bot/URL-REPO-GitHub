import { getSessionUser } from "@/lib/session";
import { can } from "@/lib/roles";
import ForbiddenContent from "@/app/forbidden";

// Gate server-side: hanya Developer.
export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) return null; // middleware/dashboard layout sudah redirect
  if (!can(user.role, "users", "read")) {
    return (
      <ForbiddenContent message="Halaman User Management hanya dapat diakses oleh Developer." />
    );
  }
  return <>{children}</>;
}
