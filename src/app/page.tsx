'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPlayers } from '@/lib/queries';
import { getSession, getMyPlayer } from '@/lib/auth';
import { getGuest, guestAsPlayer, isOnline } from '@/lib/offline';
import { ACADEMY, courseProgress } from '@/lib/academy';
import { levelFor, levelProgress } from '@/lib/gamification';
import { supabase } from '@/lib/client';
import { Avatar, ProgressBar } from '@/components/ui';
import type { Player } from '@/lib/types';

type RecentGame = {
  id: string; white: string; black: string; result: string | null;
  status: string; when: string;
};

const RATING_STATS: [string, string, keyof Player][] = [
  ['⚡', 'Blitz', 'ratingBlitz'],
  ['⏱', 'Rápida', 'ratingRapid'],
  ['🐢', 'Clássica', 'ratingClassical'],
  ['🧩', 'Puzzles', 'ratingPuzzle'],
];

export default function Home() {
  const [me, setMe] = useState<Player | null>(null);
  const [top, setTop] = useState<Player[]>([]);
  const [recent, setRecent] = useState<RecentGame[]>([]);
  const [nextCourse, setNextCourse] = useState<{ slug: string; title: string; icon: string; pct: number } | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const s = await getSession();
      let p: Player | null = null;
      if (s) {
        p = await getMyPlayer(s.userId);
      } else {
        const g = getGuest();
        if (g) { p = guestAsPlayer(g); setIsGuest(true); }
      }
      setMe(p);

      // ranking + partidas + progresso (online apenas)
      if (isOnline() && s) {
        getPlayers().then((pl) => setTop(pl.slice(0, 5))).catch(() => {});
        if (p && p.id !== 'guest') {
          supabase.from('live_matches')
            .select('id,result,status,created_at,white:players!live_matches_white_player_id_fkey(username),black:players!live_matches_black_player_id_fkey(username)')
            .or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`)
            .order('created_at', { ascending: false }).limit(3)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then(({ data }) => setRecent((data ?? []).map((m: any) => ({
              id: m.id, white: m.white?.username ?? '—', black: m.black?.username ?? '…',
              result: m.result, status: m.status,
              when: new Date(m.created_at).toLocaleDateString('pt-PT'),
            }))));

          // curso a continuar: o que tem mais progresso <100%, senão o 1º
          const { data: lp } = await supabase.from('lesson_progress')
            .select('lesson_slug').eq('player_id', p.id);
          const done = new Set((lp ?? []).map((r) => r.lesson_slug as string));
          let best: typeof nextCourse = null;
          for (const c of ACADEMY) {
            const pct = courseProgress(c, done);
            if (pct > 0 && pct < 100) { best = { slug: c.slug, title: c.title, icon: c.icon, pct }; break; }
          }
          if (!best) {
            const c = ACADEMY[0];
            const pct = courseProgress(c, done);
            if (pct < 100) best = { slug: c.slug, title: c.title, icon: c.icon, pct };
          }
          setNextCourse(best);
        }
      }
    });
    return () => clearTimeout(t);
  }, []);

  const xp = me?.xp ?? 0;
  const level = levelFor(xp);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* saudação */}
      <section className="flex items-center gap-3">
        <Avatar name={me?.fullName ?? 'Visitante'} url={me?.avatarUrl} size={52} />
        <div className="flex-1">
          <div className="text-lg font-bold">Olá, {me?.fullName?.split(' ')[0] ?? 'jogador'} 👋</div>
          <div className="text-xs muted">
            {isGuest ? 'Modo visitante (offline)' : `@${me?.username ?? '—'}`}
            {me?.inpVerified ? ' ✓' : ''}
          </div>
        </div>
        <span className="chip gold">Nv. {level}</span>
      </section>

      {/* ratings + XP + streak */}
      <section className="panel p-3">
        <div className="flex justify-around">
          {RATING_STATS.map(([icon, label, field]) => (
            <div key={label} className="rating-badge">
              <span className="rb-icon">{icon}</span>
              <span className="rb-value">{(me?.[field] as number) ?? me?.rating ?? 1200}</span>
              <span className="rb-label">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-[var(--border)] pt-3">
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-[11px] muted">
              <span>Nível {level}</span><span>{xp} XP</span>
            </div>
            <ProgressBar pct={levelProgress(xp)} />
          </div>
          <span className="chip" title="Dias seguidos a jogar">🔥 {me?.streakDays ?? 0}</span>
        </div>
      </section>

      {/* acções principais */}
      <section className="grid grid-cols-3 gap-3">
        <Link href="/jogar" className="btn flex-col gap-1 py-4 text-center">
          <span className="text-xl">▶</span> JOGAR
        </Link>
        <Link href="/treinar" className="btn-ghost flex-col gap-1 py-4 text-center">
          <span className="text-xl">🎯</span> TREINAR
        </Link>
        <Link href="/puzzles" className="btn-ghost flex-col gap-1 py-4 text-center">
          <span className="text-xl">🧩</span> PUZZLES
        </Link>
      </section>

      {/* última partida */}
      {recent.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">Últimas partidas</h2>
            <Link href="/analise" className="text-xs accent">Analisar →</Link>
          </div>
          <div className="space-y-2">
            {recent.map((g) => (
              <Link key={g.id} href={`/analise?m=${g.id}`}
                className="panel flex items-center justify-between p-3 text-sm hover:border-[var(--accent)]">
                <span>{g.white} vs {g.black}</span>
                <span className="muted text-xs">
                  {g.status === 'active' ? '🔴 ao vivo' : g.result ?? g.status} · {g.when}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* continuar curso */}
      {nextCourse && (
        <Link href={`/academy/${nextCourse.slug}`} className="tile flex items-center gap-3 p-4">
          <span className="tile-icon text-xl">{nextCourse.icon}</span>
          <div className="flex-1">
            <div className="text-xs muted">Continuar a aprender</div>
            <div className="text-sm font-bold">{nextCourse.title}</div>
            <ProgressBar pct={nextCourse.pct} />
          </div>
          <span className="muted">▸</span>
        </Link>
      )}

      {/* ranking */}
      {top.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">🏆 Ranking INP</h2>
            <Link href="/ranking" className="text-xs accent">Ver tudo →</Link>
          </div>
          <div className="panel divide-y divide-[var(--border)]">
            {top.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 text-sm">
                <span className={`w-5 text-center font-bold ${i === 0 ? 'gold' : 'muted'}`}>{i + 1}</span>
                <Avatar name={p.fullName} url={p.avatarUrl} size={26} />
                <span className="flex-1 truncate">{p.fullName}{p.inpVerified ? ' ✓' : ''}</span>
                <span className="chip">{p.rating}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* torneios */}
      <Link href="/torneios" className="banner flex items-center justify-between p-4">
        <div>
          <div className="font-bold">🏟️ Torneios INP</div>
          <div className="text-xs text-white/85">INP Championship · Kibaúla Cup · Batalha dos Cursos</div>
        </div>
        <span className="chip bg-black/20 text-white">Ver →</span>
      </Link>
    </div>
  );
}
