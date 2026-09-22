"use client";

import { useEffect, useState } from "react";

interface Health {
  status: string;
  components: {
    api: string;
    database: string;
  };
}

const LABELS: Record<string, string> = {
  api: "API",
  database: "Database",
  operational: "Operational",
  connected: "Connected",
  disconnected: "Disconnected",
};

export default function SystemStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fail"))))
      .then((data: Health) => setHealth(data))
      .catch(() => setFailed(true));
  }, []);

  function Row({ ok, label, value }: { ok: boolean; label: string; value: string }) {
    return (
      <div className="status-row">
        <span className={`status-dot ${ok ? "status-dot--ok" : "status-dot--bad"}`} aria-hidden="true" />
        <span className="status-label">{label}:</span>
        <span className={`status-value ${ok ? "status-value--ok" : "status-value--bad"}`}>
          {ok ? "✓" : "✕"} {value}
        </span>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="sys-status" aria-live="polite">
        <Row ok={false} label="API" value="Unreachable" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="sys-status" aria-live="polite">
        <div className="status-row">
          <span className="status-dot status-dot--loading" aria-hidden="true" />
          <span className="status-label">Memeriksa status sistem...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sys-status" aria-live="polite">
      <p className="sys-status-title">SYSTEM STATUS</p>
      <Row ok label="API" value={LABELS[health.components.api] ?? health.components.api} />
      <Row
        ok={health.components.database === "connected"}
        label="Database"
        value={LABELS[health.components.database] ?? health.components.database}
      />
    </div>
  );
}
