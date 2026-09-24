"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashCSS, SectionTitle, formatDateTime } from "@/components/dashboard/SharedUI";
import AvatarDisplay from "@/components/AvatarDisplay";
import { SearchIcon, MessageIcon } from "@/components/Icons";

interface Reply {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  user: { username: string; profile: { fullName: string; photo: string | null } | null };
}

interface Post {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  user: { username: string; profile: { fullName: string; photo: string | null } | null };
  replies: Reply[];
}

export default function DiscussionsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [me, setMe] = useState<{ id: number; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [posting, setPosting] = useState(false);
  const [q, setQ] = useState("");
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [openReply, setOpenReply] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/discussions${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      if (res.status === 401) {
        window.location.href = "/login?next=/dashboard/discussions";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
      } else {
        setError("Tidak dapat memuat diskusi.");
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.user && setMe({ id: d.user.id, role: d.user.role }))
      .catch(() => {});
  }, [load]);

  function onSearchChange(v: string) {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 300);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!composer.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: composer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim pesan.");
        return;
      }
      setComposer("");
      setPosts((prev) => [data.post, ...prev]);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setPosting(false);
    }
  }

  async function handleReply(postId: number) {
    const content = (replyText[postId] || "").trim();
    if (!content) return;
    setError(null);
    try {
      const res = await fetch(`/api/discussions/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengirim balasan.");
        return;
      }
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, data.reply] } : p))
      );
      setReplyText((prev) => ({ ...prev, [postId]: "" }));
      setOpenReply(null);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    }
  }

  async function handleDelete(kind: "post" | "reply", id: number) {
    if (!confirm(kind === "post" ? "Hapus postingan ini beserta balasannya?" : "Hapus balasan ini?")) return;
    setDeleting(`${kind}-${id}`);
    setError(null);
    try {
      const res = await fetch(
        kind === "post" ? `/api/discussions/${id}` : `/api/discussions/${id}/replies`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal menghapus.");
        return;
      }
      if (kind === "post") {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        setPosts((prev) => prev.map((p) => ({ ...p, replies: p.replies.filter((r) => r.id !== id) })));
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setDeleting(null);
    }
  }

  const isModerator = me?.role === "DEVELOPER" || me?.role === "WALI_KELAS";

  return (
    <div>
      <DashCSS />
      <div className="dash-page-header dash-page-header--row">
        <div>
          <h1 className="dash-page-title">Diskusi Kelas</h1>
          <p className="dash-page-desc">Ruang diskusi bersama seluruh anggota kelas.</p>
        </div>
        <div className="dash-search-wrap">
          <SearchIcon size={14} />
          <input
            className="dash-search-input"
            placeholder="Cari diskusi..."
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Cari diskusi"
          />
        </div>
      </div>

      {error && <div className="dash-alert dash-alert--error" role="alert">{error}</div>}

      <form className="dash-card disc-composer" onSubmit={handlePost}>
        <label className="dash-form-label" htmlFor="disc-content">
          Pesan baru
        </label>
        <textarea
          id="disc-content"
          className="dash-form-textarea"
          rows={3}
          maxLength={2000}
          placeholder="Tulis sesuatu untuk kelas... (maks 2000 karakter)"
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
        />
        <div className="disc-composer-foot">
          <span className="dash-form-hint">{composer.length}/2000</span>
          <button className="dash-btn" disabled={posting || !composer.trim()}>
            {posting ? "Mengirim..." : "Kirim"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="dash-empty">Memuat...</div>
      ) : posts.length === 0 ? (
        <div className="dash-empty">
          <MessageIcon size={24} />
          {q ? `Tidak ada hasil untuk "${q}".` : "Belum ada diskusi. Mulai percakapan pertama!"}
        </div>
      ) : (
        <div className="disc-list">
          {posts.map((p) => (
            <article key={p.id} className="dash-card disc-post">
              <div className="disc-post-head">
                <AvatarDisplay name={p.user.profile?.fullName ?? p.user.username} photo={p.user.profile?.photo} size="sm" />
                <div className="disc-post-id">
                  <span className="disc-post-name">{p.user.profile?.fullName ?? p.user.username}</span>
                  <span className="disc-post-meta">
                    @{p.user.username} · {formatDateTime(p.createdAt)}
                  </span>
                </div>
                {(p.userId === me?.id || isModerator) && (
                  <button
                    className="disc-del"
                    onClick={() => handleDelete("post", p.id)}
                    disabled={deleting === `post-${p.id}`}
                    aria-label="Hapus postingan"
                    title={p.userId === me?.id ? "Hapus postingan saya" : "Hapus (moderator)"}
                  >
                    Hapus
                  </button>
                )}
              </div>
              <p className="disc-post-content">{p.content}</p>

              {p.replies.length > 0 && (
                <div className="disc-replies">
                  {p.replies.map((r) => (
                    <div key={r.id} className="disc-reply">
                      <AvatarDisplay name={r.user.profile?.fullName ?? r.user.username} photo={r.user.profile?.photo} size="sm" />
                      <div className="disc-reply-body">
                        <span className="disc-post-meta">
                          <strong>{r.user.profile?.fullName ?? r.user.username}</strong> · {formatDateTime(r.createdAt)}
                        </span>
                        <p className="disc-reply-text">{r.content}</p>
                      </div>
                      {(r.userId === me?.id || isModerator) && (
                        <button
                          className="disc-del"
                          onClick={() => handleDelete("reply", r.id)}
                          disabled={deleting === `reply-${r.id}`}
                          aria-label="Hapus balasan"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="disc-actions">
                {openReply === p.id ? (
                  <div className="disc-reply-form">
                    <input
                      className="dash-form-input"
                      placeholder="Tulis balasan... (maks 1000 karakter)"
                      maxLength={1000}
                      value={replyText[p.id] ?? ""}
                      onChange={(e) => setReplyText((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleReply(p.id);
                        }
                      }}
                      autoFocus
                    />
                    <button className="dash-btn dash-btn--sm" onClick={() => handleReply(p.id)}>
                      Balas
                    </button>
                    <button
                      className="dash-btn dash-btn--secondary dash-btn--sm"
                      onClick={() => setOpenReply(null)}
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    className="disc-reply-btn"
                    onClick={() => setOpenReply(p.id)}
                  >
                    Balas ({p.replies.length})
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <style>{`
        .disc-composer {
          margin-bottom: 1.25rem;
        }

        .disc-composer-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.625rem;
        }

        .disc-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 760px;
        }

        .disc-post-head {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.75rem;
        }

        .disc-post-id {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .disc-post-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .disc-post-meta {
          font-size: 0.68rem;
          color: var(--color-text-subtle);
        }

        .disc-post-content {
          font-size: 0.875rem;
          color: var(--color-text);
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .disc-del {
          font-size: 0.7rem;
          color: var(--color-text-subtle);
          background: none;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.15s, border-color 0.15s;
        }

        .disc-del:hover:not(:disabled) {
          color: var(--color-danger);
          border-color: var(--color-danger);
        }

        .disc-replies {
          margin-top: 0.875rem;
          padding-left: 0.875rem;
          border-left: 2px solid var(--color-border-light);
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .disc-reply {
          display: flex;
          gap: 0.5rem;
          align-items: flex-start;
        }

        .disc-reply-body {
          flex: 1;
          min-width: 0;
        }

        .disc-reply-text {
          font-size: 0.82rem;
          color: var(--color-text);
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .disc-actions {
          margin-top: 0.75rem;
          padding-top: 0.625rem;
          border-top: 1px solid var(--color-border-light);
        }

        .disc-reply-btn {
          font-size: 0.78rem;
          font-weight: 550;
          color: var(--color-accent);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .disc-reply-btn:hover {
          text-decoration: underline;
        }

        .disc-reply-form {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .disc-reply-form .dash-form-input {
          flex: 1;
          min-width: 180px;
        }
      `}</style>
    </div>
  );
}
