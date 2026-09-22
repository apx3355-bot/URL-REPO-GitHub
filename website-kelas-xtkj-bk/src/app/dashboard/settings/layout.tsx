import { getSessionUser } from "@/lib/session";
import type { ReactNode } from "react";

// Guard server-side: halaman Settings hanya untuk DEVELOPER.
// Menu hiding saja tidak cukup — akses langsung via URL tetap ditolak di sini.
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.role !== "DEVELOPER") {
    return (
      <div className="guard-denied">
        <p className="guard-denied-title">ACCESS DENIED</p>
        <p className="guard-denied-text">
          Anda tidak memiliki permission untuk mengakses halaman ini.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
