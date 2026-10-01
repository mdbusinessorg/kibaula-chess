'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ACADEMY, courseProgress, courseLessons } from '@/lib/academy';
import { getSession, getMyPlayer } from '@/lib/auth';
import { getGuest } from '@/lib/offline';
import { supabase } from '@/lib/client';
import { ProgressBar } from '@/components/ui';

const TILES = [
  { href: '/puzzles', icon: '🧩', title: 'Puzzles', sub: 'Mate, tática, finais' },
  { href: '/puzzles?t=mate1', icon: '⚔️', title: 'Mate em 1–3', sub: 'Finalizações rápidas' },
  { href: '/academy/aberturas', icon: '📖', title: 'Aberturas', sub: 'Primeiras jogadas' },
  { href: '/puzzles?t=finais', icon: '🏁', title: 'Finais', sub: 'Converte a vantagem' },
  { href: '/academy/estrategia', icon: '🧭', title: 'Estratégia', sub: 'Planos de longo prazo' },
  { href: '/analise', icon: '🔍', title: 'Análise', sub: 'Revê as tuas partidas' },
] as const;

export default function TreinarPage() {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [nextLesson, setNextLesson] = useState<{ course: string; title: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      let done = new Set<string>();
      const s = await getSession();
      if (!s) {
        done = new Set(getGuest()?.lessons ?? []);
      } else {
        const p = await getMyPlayer(s.userId);
        if (p) {
          const { data } = await supabase.from('lesson_progress')
            .select('lesson_slug').eq('player_id', p.id);
          done = new Set((data ?? []).map((r) => r.lesson_slug as string));
        }
      }
      const prog: Record<string, number> = {};
      let next: { course: string; title: string } | null = null;
      for (const c of ACADEMY) {
        prog[c.slug] = courseProgress(c, done);
        if (!next) {
          const pending = courseLessons(c).find((l) => !done.has(l.slug));
          if (pending) next = { course: c.slug, title: `${c.title} → ${pending.title}` };
        }
      }
      setProgress(prog);
      setNextLesson(next);
    });
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">🎯 Treinar</h1>

      {nextLesson && (
        <Link href={`/academy/${nextLesson.course}`} className="banner block p-4">
          <div className="text-xs uppercase tracking-wide opacity-80">Continuar onde paraste</div>
          <div className="font-bold">{nextLesson.title}</div>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.href + t.title} href={t.href} className="tile p-4 text-center">
            <div className="mb-1 text-2xl">{t.icon}</div>
            <div className="text-sm font-bold">{t.title}</div>
            <div className="text-[11px] muted">{t.sub}</div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide muted">Os teus cursos</h2>
        <div className="space-y-2">
          {ACADEMY.map((c) => (
            <Link key={c.slug} href={`/academy/${c.slug}`}
              className="panel flex items-center gap-3 p-3 hover:border-[var(--accent)]">
              <span className="tile-icon">{c.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold">{c.title}</div>
                <ProgressBar pct={progress[c.slug] ?? 0} />
              </div>
              <span className="text-xs muted">{progress[c.slug] ?? 0}%</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
