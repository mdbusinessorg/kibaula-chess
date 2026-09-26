'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { getCourses, getPlayers } from '@/lib/queries';
import { getSession, getMyPlayer } from '@/lib/auth';
import { supabase } from '@/lib/client';
import type { Course, Player } from '@/lib/types';

type RecentGame = {
  id: string; white: string; black: string; result: string | null;
  when: string; fen: string;
};

const STATS: [string, string][] = [
  ['⚡', 'Blitz'], ['⏱', 'Rápida'], ['🎯', 'Bullet'], ['♞', 'Geral'],
];

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [me, setMe] = useState<Player | null>(null);
  const [top, setTop] = useState<Player[]>([]);
  const [recent, setRecent] = useState<RecentGame[]>([]);

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
    getPlayers().then((p) => setTop(p.slice(0, 5))).catch(() => {});
    getSession().then(async (s) => {
      if (!s) return;
      const p = await getMyPlayer(s.userId);
      setMe(p);
      if (!p) return;
      const { data } = await supabase.from('live_matches')
        .select('id,result,fen,created_at,status,white:players!live_matches_white_player_id_fkey(username),black:players!live_matches_black_player_id_fkey(username)')
        .or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`)
        .order('created_at', { ascending: false }).limit(4);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecent((data ?? []).map((m: any) => ({
        id: m.id, white: m.white?.username ?? '—', black: m.black?.username ?? '—',
        result: m.result, fen: m.fen,
        when: new Date(m.created_at).toLocaleDateString('pt-PT'),
      })));
    });
  }, []);

  const games = (me?.wins ?? 0) + (me?.losses ?? 0) + (me?.draws ?? 0);

  return (
    <div className="space-y-6">
      {/* cabeçalho estilo chess.com */}
      <section className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="tile-icon !h-14 !w-14 !rounded-full text-2xl">👤</span>
          <div>
            <div className="text-lg font-bold">{me?.fullName ?? 'Kibaúla Chess'}</div>
            {me && <div className="text-xs muted">@{me.username}{me.inpVerified ? ' ✓' : ''}</div>}
          </div>
        </div>
        {me && <span className="chip gold">🪙 {me.rating}</span>}
      </section>

      {/* ratings */}
      {me && (
        <section className="flex justify-around rounded-xl bg-[var(--panel)] p-3">
          {STATS.map(([icon, label], i) => (
            <div key={label} className="rating-badge">
              <span className="rb-icon">{icon}</span>
              <span className="rb-value">
                {i === 3 ? me.rating : Math.max(400, me.rating + (i - 2) * 10)}
              </span>
              <span className="rb-label">{label}</span>
            </div>
          ))}
        </section>
      )}

      {/* jogar */}
      <section className="space-y-3">
        <Link href="/jogar" className="btn block w-full py-4 text-center text-lg">
          ▶ Play!
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/jogar?bot=1" className="panel flex items-center gap-3 p-3 text-sm font-semibold">
            <span className="tile-icon">🤖</span> Play Computer
          </Link>
          <Link href="/batalha" className="panel flex items-center gap-3 p-3 text-sm font-semibold">
            <span className="tile-icon">⚔️</span> Batalha
          </Link>
        </div>
      </section>

      {/* partidas anteriores com mini-tabuleiros */}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 font-bold">Partidas anteriores</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recent.map((g) => (
              <Link key={g.id} href="/jogar" className="tile overflow-hidden">
                <div className="pointer-events-none w-full">
                  <Chessboard options={{ position: g.fen, allowDragging: false }} />
                </div>
                <div className="p-2 text-xs">
                  <div className="truncate font-semibold">{g.white} vs {g.black}</div>
                  <div className="muted">{g.result ?? 'ao vivo'} · {g.when}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* banner */}
      <section className="banner flex items-center justify-between p-4">
        <div>
          <div className="font-bold">8 ÁREAS. UMA COMUNIDADE. ♞</div>
          <div className="text-sm text-white/85">
            Joga, sobe no ranking e defende o teu curso no INP.
          </div>
        </div>
        <Link href="/ranking" className="chip bg-black/20 text-white">Ranking →</Link>
      </section>

      {/* cursos */}
      <section>
        <h2 className="mb-4 text-lg font-bold">Cursos do INP</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((c) => (
            <Link key={c.slug} href={`/ranking?curso=${c.slug}`}
              className="tile course-card group p-4">
              <div className="text-2xl">{c.icon}</div>
              <div className="mt-2 font-semibold uppercase tracking-wide">{c.abbreviation}</div>
              <div className="text-sm muted">{c.name}</div>
              <div className="course-card-stats mt-3 text-xs muted">
                <div>{c.players} jogadores · {c.games} partidas</div>
                <div>Rating médio: {c.avgRating || '—'}</div>
                <div className="accent">#{c.rank} no Ranking Kibaúla</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* top jogadores */}
      {top.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Top jogadores</h2>
            <Link href="/ranking" className="text-xs accent">Ver ranking →</Link>
          </div>
          <div className="panel divide-y divide-[var(--border)]">
            {top.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 text-sm">
                <span className={`w-6 text-center font-bold ${i === 0 ? 'gold' : 'muted'}`}>
                  {i + 1}
                </span>
                <span className="flex-1">{p.fullName}</span>
                <span className="chip">{p.rating}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {games > 0 && (
        <p className="text-center text-xs muted">
          {me?.fullName}: {me?.wins}V · {me?.draws}E · {me?.losses}D
        </p>
      )}
    </div>
  );
}
