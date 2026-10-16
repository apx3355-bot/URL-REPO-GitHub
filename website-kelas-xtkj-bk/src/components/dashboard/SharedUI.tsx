import type { SessionUser } from "@/lib/session";
import type { Role } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";

// Komponen UI bersama untuk dashboard — konsisten dengan gaya Phase 1-2.

export function DashCSS() {
  return (
    <style>{`
      .dash-section {
        margin-bottom: 2.5rem;
      }
      .dash-section-title {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--color-text-subtle);
        margin-bottom: 1.25rem;
        padding-bottom: 0.625rem;
        border-bottom: 1px solid var(--color-border-light);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .dash-section-title::before {
        content: "";
        display: inline-block;
        width: 3px;
        height: 12px;
        border-radius: 2px;
        background: var(--color-accent);
        flex-shrink: 0;
      }
      .dash-grid-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 2.5rem;
      }
      .stat-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl, 16px);
        padding: 1.375rem 1.5rem;
        position: relative;
        overflow: hidden;
        transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      }
      .stat-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--color-accent-soft, rgba(6,182,212,0.3)), transparent);
        opacity: 0;
        transition: opacity 0.2s;
      }
      .stat-card:hover {
        border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md), 0 0 0 1px color-mix(in srgb, var(--color-accent) 10%, transparent);
      }
      .stat-card:hover::before {
        opacity: 1;
      }
      .stat-card-number {
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        color: var(--color-text);
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .stat-card-label {
        font-size: 0.68rem;
        color: var(--color-text-subtle);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-top: 0.5rem;
        font-weight: 600;
      }
      .dash-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl, 16px);
        padding: 1.5rem;
      }
      .dash-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .dash-item {
        padding: 0.875rem 1.125rem;
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-md);
        background: var(--color-bg-alt);
        transition: border-color 0.15s, background 0.15s;
      }
      .dash-item:hover {
        border-color: var(--color-border);
        background: var(--color-surface);
      }
      .dash-item-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-text);
      }
      .dash-item-desc {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin-top: 0.25rem;
        line-height: 1.6;
      }
      .dash-item-meta {
        font-size: 0.68rem;
        color: var(--color-text-subtle);
        margin-top: 0.375rem;
        font-variant-numeric: tabular-nums;
      }
      .dash-empty {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--color-text-muted);
        font-size: 0.85rem;
        border: 1px dashed var(--color-border);
        border-radius: var(--radius-lg);
      }
      .dash-alert {
        padding: 0.75rem 1rem;
        border-radius: var(--radius-md);
        font-size: 0.825rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .dash-alert--success { background: var(--color-success-soft); border: 1px solid var(--color-success); color: var(--color-success); }
      .dash-alert--error { background: var(--color-danger-soft); border: 1px solid var(--color-danger); color: var(--color-danger); }
      .dash-table-wrap {
        overflow-x: auto;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        background: var(--color-surface);
      }
      .dash-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.825rem;
      }
      .dash-table th {
        padding: 0.75rem 1rem;
        text-align: left;
        font-size: 0.63rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--color-text-subtle);
        background: var(--color-bg-alt);
        border-bottom: 1px solid var(--color-border);
        white-space: nowrap;
      }
      .dash-table td {
        padding: 0.75rem 1rem;
        color: var(--color-text);
        border-bottom: 1px solid var(--color-border-light);
      }
      .dash-table tr:last-child td { border-bottom: none; }
      .dash-table tbody tr { transition: background 0.12s; }
      .dash-table tbody tr:hover td { background: var(--color-surface-hover); }
      .dash-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 1.125rem;
        background: var(--color-primary);
        color: #fff;
        border-radius: var(--radius-md);
        font-size: 0.8rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
        letter-spacing: 0.01em;
      }
      .dash-btn:hover:not(:disabled) { background: var(--color-primary-hover); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(37,99,235,0.35); }
      .dash-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      .dash-btn--secondary {
        background: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);
      }
      .dash-btn--secondary:hover:not(:disabled) {
        background: var(--color-surface-hover);
        border-color: var(--color-accent);
        color: var(--color-accent);
        box-shadow: none;
      }
      .dash-btn--danger {
        background: var(--color-danger);
      }
      .dash-btn--danger:hover:not(:disabled) { opacity: 0.88; box-shadow: 0 4px 16px rgba(239,68,68,0.3); }
      .dash-btn--sm {
        padding: 0.3125rem 0.75rem;
        font-size: 0.75rem;
      }
      .dash-form-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 0.375rem;
        letter-spacing: 0.01em;
      }
      .dash-form-input,
      .dash-form-select,
      .dash-form-textarea {
        width: 100%;
        padding: 0.5625rem 0.875rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: 0.825rem;
        background: var(--color-bg-alt);
        color: var(--color-text);
        outline: none;
        font-family: inherit;
        transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
      }
      .dash-form-input:focus,
      .dash-form-select:focus,
      .dash-form-textarea:focus {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px var(--color-accent-soft);
        background: var(--color-surface);
      }
      .dash-form-error {
        font-size: 0.7rem;
        color: var(--color-danger);
        margin-top: 0.3125rem;
      }
      .dash-form-group {
        margin-bottom: 1rem;
      }
      .dash-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        backdrop-filter: blur(4px);
        z-index: 300;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .dash-modal {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl, 16px);
        padding: 1.75rem;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        animation: modalIn 0.18s cubic-bezier(0.34,1.56,0.64,1);
        box-shadow: var(--shadow-lg);
      }
      @keyframes modalIn {
        from { opacity: 0; transform: translateY(10px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .dash-modal-title {
        font-size: 1.1rem;
        font-weight: 700;
        margin-bottom: 1.25rem;
        letter-spacing: -0.02em;
      }
      .dash-modal-actions {
        display: flex;
        gap: 0.625rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
      }
      .dash-page-header {
        margin-bottom: 2rem;
      }
      .dash-page-title {
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        color: var(--color-text);
        line-height: 1.2;
      }
      .dash-page-desc {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin-top: 0.375rem;
        line-height: 1.5;
      }
      .dash-status {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.63rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 0.1875rem 0.625rem;
        border-radius: 999px;
      }
      .dash-status::before {
        content: "";
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
      }
      .dash-status--published { background: var(--color-success-soft); color: var(--color-success); }
      .dash-status--draft { background: var(--color-warning-soft); color: var(--color-warning); }
      .dash-status--archived { background: var(--color-border-light); color: var(--color-text-muted); }
      .dash-page-header--row {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .agenda-tabs {
        display: inline-flex;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        overflow: hidden;
        background: var(--color-bg-alt);
      }
      .agenda-tab {
        padding: 0.4375rem 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        background: transparent;
        color: var(--color-text-muted);
        border: none;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .agenda-tab--active {
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }
      .dash-search-wrap {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4375rem 0.875rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        color: var(--color-text-subtle);
        background: var(--color-bg-alt);
        min-width: 220px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .dash-search-wrap:focus-within {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px var(--color-accent-soft);
      }
      .dash-search-input {
        border: none;
        outline: none;
        background: transparent;
        color: var(--color-text);
        font-size: 0.82rem;
        width: 100%;
      }
      .dash-link {
        font-size: 0.8rem;
        color: var(--color-accent);
        font-weight: 500;
        transition: opacity 0.15s;
      }
      .dash-link:hover { opacity: 0.75; }
      @media (max-width: 480px) {
        .dash-search-wrap { min-width: 0; width: 100%; }
      }
      @media (min-width: 640px) {
        .dash-grid-stats { grid-template-columns: repeat(4, 1fr); }
      }
    `}</style>
  );
}

export function WelcomeHeader({ user }: { user: SessionUser }) {
  return (
    <div className="dash-page-header">
      <h1 className="dash-page-title">
        Selamat datang, {user.fullName}
      </h1>
      <p className="dash-page-desc">
        Dashboard {ROLE_LABELS[user.role as Role]} — website kelas X TKJ BK.
      </p>
    </div>
  );
}

export function StatGrid({
  items,
}: {
  items: { label: string; value: number | string }[];
}) {
  return (
    <div className="dash-grid-stats">
      {items.map((s) => (
        <div key={s.label} className="stat-card">
          <div className="stat-card-number">{s.value}</div>
          <div className="stat-card-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="dash-section-title">{children}</h2>;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
