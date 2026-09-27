'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getPlayer } from '@/lib/queries';
import { getSession, getMyPlayer } from '@/lib/auth';
import { getGuest, guestAsPlayer } from '@/lib/offline';
import { levelFor, levelProgress, ACHIEVEMENTS } from '@/lib/gamification';
import { supabase } from '@/lib/client';
import { Avatar, ProgressBar, LoadingState, EmptyState } from '@/components/ui';
import type { Player } from '@/lib/types';

const RATING_STATS: [string, string, keyof Player][] = [
  ['⚡', 'Blitz', 'ratingBlitz'],
  ['⏱', 'Rápida', 'ratingRapid'],
  ['🐢', 'Clássica', 'ratingClassical'],
  ['🧩', 'Puzzles', 'ratingPuzzle'],
];

type Hist = { at: string; kind: string; rating: number };

function PerfilInner() {
  const params = useSearchParams();
  const username = params.get('u');
  const [p, setP] = useState<Player | null | undefined>(undefined);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [hist, setHist] = useState<Hist[]>([]);
  const [lessons, setLessons] = useState(0);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      let player: Player | null = null;
      if (username) {
        player = await getPlayer(username);
      } else {
        const s = await getSession();
        if (s) player = await getMyPlayer(s.userId);
        else {
          const g = getGuest();
          if (g) { player = guestAsPlayer(g); setIsGuest(true); }
        }
      }
      setP(player);
      if (!player || player.id === 'guest') return;

      const [{ data: ach }, { data: rh }, { data: lp }] = await Promise.all([
        supabase.from('player_achievements').select('code').eq('player_id', player.id),
        supabase.from('rating_history').select('kind,rating,created_at')
          .eq('player_id', player.id).order('created_at', { ascending: false }).limit(12),
        supabase.from('lesson_progress').select('lesson_slug').eq('player_id', player.id),
      ]);
      setUnlocked(new Set((ach ?? []).map((a) => a.code as string)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHist((rh ?? []).map((r: any) => ({ at: r.created_at, kind: r.kind, rating: r.rating })));
      setLessons(lp?.length ?? 0);
    });
    return () => clearTimeout(t);
  }, [username]);

  if (p === undefined) return <LoadingState />;
  if (!p) return <EmptyState icon="👤" title="Jogador não encontrado" />;

  const xp = p.xp ?? 0;
  const level = levelFor(xp);
  const games = p.wins + p.draws + p.losses;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* cabeçalho do perfil */}
      <section className="panel p-5">
        <div className="flex items-center gap-4">
          <Avatar name={p.fullName} url={p.avatarUrl} size={64} />
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {p.fullName}
              {p.inpVerified && <span className="accent"> ✓</span>}
            </h1>
            <p className="text-sm muted">@{p.username}{isGuest ? ' · visitante' : ''}</p>
            {p.courseName && <p className="text-xs muted">{p.courseAbbr} · {p.className ?? ''}</p>}
          </div>
          <span className="chip gold">Nv. {level}</span>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] muted">
            <span>Nível {level}</span><span>{xp} XP</span>
          </div>
          <ProgressBar pct={levelProgress(xp)} />
        </div>
      </section>

      {/* ratings por controlo de tempo */}
      <section className="panel flex justify-around p-4">
        {RATING_STATS.map(([icon, label, field]) => (
          <div key={label} className="rating-badge">
            <span className="rb-icon">{icon}</span>
            <span className="rb-value">{(p[field] as number) ?? p.rating}</span>
            <span className="rb-label">{label}</span>
          </div>
        ))}
      </section>

      {/* stats */}
      <section className="grid grid-cols-4 gap-2 text-center">
        {[
          [games, 'Partidas'], [p.wins, 'Vitórias'],
          [p.puzzlesSolved, 'Puzzles'], [p.streakDays ?? 0, '🔥 Streak'],
        ].map(([v, l]) => (
          <div key={String(l)} className="panel p-3">
            <div className="text-lg font-bold">{v}</div>
            <div className="text-[10px] muted uppercase">{l}</div>
          </div>
        ))}
      </section>

      {/* conquistas */}
      <section className="panel p-5">
        <h2 className="mb-3 font-semibold">Conquistas</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const has = unlocked.has(a.code) || isGuest && false;
            return (
              <div key={a.code} title={`${a.title} — ${a.desc}`}
                className={`rounded-lg border p-2 text-center ${has ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] opacity-40'}`}>
                <div className="text-xl">{has ? a.icon : '🔒'}</div>
                <div className="text-[10px] font-semibold leading-tight">{a.title}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* histórico de rating */}
      {hist.length > 0 && (
        <section className="panel p-5">
          <h2 className="mb-3 font-semibold">Histórico de rating</h2>
          <div className="space-y-1 text-xs">
            {hist.map((h, i) => (
              <div key={i} className="flex justify-between border-b border-[var(--border)] pb-1">
                <span className="muted">{new Date(h.at).toLocaleDateString('pt-PT')} · {h.kind.replace('rating_', '')}</span>
                <strong>{h.rating}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* perfil académico */}
      {p.courseName && (
        <section className="panel p-5">
          <h2 className="mb-3 font-semibold">Perfil Académico</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="muted">Instituição</dt><dd>Instituto Nacional de Petróleos</dd>
            <dt className="muted">Curso</dt><dd>{p.courseName}</dd>
            <dt className="muted">Classe</dt><dd>{p.gradeLabel ?? '—'}</dd>
            <dt className="muted">Turma</dt><dd>{p.className ?? '—'}</dd>
            <dt className="muted">Ano lectivo</dt><dd>{p.academicYear ?? '—'}</dd>
            <dt className="muted">Lições</dt><dd>{lessons} concluídas</dd>
          </dl>
        </section>
      )}

      {isGuest && (
        <Link href="/login" className="btn block w-full py-3 text-center text-sm">
          Criar conta para guardar o progresso →
        </Link>
      )}
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <PerfilInner />
    </Suspense>
  );
}
