'use client';

// INP CHESS — design system

import { useEffect, useState, type ReactNode } from 'react';
import { useOnline, useQueueCount } from '@/lib/offline';
import { CLASS_META, type MoveClass } from '@/lib/engine';
import { levelProgress } from '@/lib/gamification';
import type { Player } from '@/lib/types';

/* ---------- indicador offline / sync ---------- */
export function OfflineIndicator() {
  const online = useOnline();
  const queued = useQueueCount();
  const [recentlyBack, setRecentlyBack] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRecentlyBack(online && queued === 0), 0);
    const t2 = online && queued === 0 ? setTimeout(() => setRecentlyBack(false), 2600) : null;
    return () => { clearTimeout(t); if (t2) clearTimeout(t2); };
  }, [online, queued]);

  if (!online) return <div className="sync-badge offline">📡 Modo offline</div>;
  if (queued > 0) return <div className="sync-badge syncing">⟳ Sincronizando…</div>;
  if (recentlyBack) return <div className="sync-badge online">✓ Sincronizado</div>;
  return null;
}

/* ---------- toast ---------- */
let toastFn: ((msg: string) => void) | null = null;
export function showToast(msg: string) { toastFn?.(msg); }

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    toastFn = (m: string) => {
      setMsg(m);
      setTimeout(() => setMsg(null), 3200);
    };
    return () => { toastFn = null; };
  }, []);
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

/* ---------- modal / sheet ---------- */
export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>{title}</strong>
          <button className="sheet-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------- progresso ---------- */
export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="pbar">
      <div className="pbar-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

/* ---------- nível / XP ---------- */
export function XpChip({ xp }: { xp: number }) {
  return (
    <div className="xp-chip" title={`${xp} XP`}>
      <ProgressBar pct={levelProgress(xp)} />
      <span className="muted">{xp} XP</span>
    </div>
  );
}

/* ---------- avatar + cartão de jogador ---------- */
export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return <img src={url} alt={name} width={size} height={size} className="avatar" />;
  }
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  return <div className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials || '♞'}</div>;
}

export function RatingBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rating-badge">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* ---------- coach bubble (classificação de jogadas) ---------- */
export function CoachBubble({ cls, text }: { cls: MoveClass; text: string }) {
  const meta = CLASS_META[cls];
  return (
    <div className="coach-bubble" style={{ borderColor: meta.color }}>
      <span className="coach-icon" style={{ background: meta.color }}>{meta.icon}</span>
      <span>{text}</span>
    </div>
  );
}

/* ---------- estados ---------- */
export function LoadingState({ label = 'A carregar…' }: { label?: string }) {
  return <div className="empty-state"><span className="spinner" />{label}</div>;
}

export function EmptyState({ icon = '♞', title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      {hint && <span className="muted">{hint}</span>}
    </div>
  );
}

/* ---------- fila de jogador (ranking) ---------- */
export function PlayerRow({ p, rank, right }: { p: Player; rank: number; right?: ReactNode }) {
  return (
    <div className="player-row">
      <span className="rank-num">{rank}</span>
      <Avatar name={p.fullName} url={p.avatarUrl} />
      <div className="player-row-main">
        <strong>{p.fullName}{p.inpVerified && <span className="verified"> ✓</span>}</strong>
        <span className="muted">@{p.username}{p.courseAbbr ? ` · ${p.courseAbbr}` : ''}</span>
      </div>
      <div className="player-row-right">{right ?? <strong>{p.rating}</strong>}</div>
    </div>
  );
}
