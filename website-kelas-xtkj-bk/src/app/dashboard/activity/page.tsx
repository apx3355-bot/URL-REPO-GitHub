"use client";

import { useCallback, useEffect, useState } from "react";
import { DashCSS, formatDateTime } from "@/components/dashboard/SharedUI";

interface Log {
  id: number;
  action: string;
  description: string;
  targetType: string | null;
  targetId: number | null;
  createdAt: string;
  user: { username: string; profile: { fullName: string } | null } | null;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activity-logs?take=100");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      } else if (res.status === 401) {
        window.location.href = "/login?next=/dashboard/activity";
        return;
      } else if (res.status === 403) {
        setForbidden(true);
      } else {
        setError("Gagal memuat log.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header">
        <h1 className="dash-page-title">Activity Log</h1>
        <p className="dash-page-desc">Riwayat aktivitas sistem (100 terbaru).</p>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}

      {forbidden ? (
        <div className="dash-empty">
          Anda tidak memiliki izin untuk melihat activity log.
        </div>
      ) : loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : logs.length === 0 ? (
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
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(log.createdAt)}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{log.action}</td>
                  <td>{log.description}</td>
                  <td>{log.user?.profile?.fullName ?? log.user?.username ?? "—"}</td>
                  <td>
                    {log.targetType ? `${log.targetType} #${log.targetId}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
