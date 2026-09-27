'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ACADEMY, courseLessons, courseProgress } from '@/lib/academy';
import { getSession, getMyPlayer } from '@/lib/auth';
import { getGuest } from '@/lib/offline';
import { supabase } from '@/lib/client';
import { ProgressBar } from '@/components/ui';

/** Lições concluídas do utilizador (BD online ou guest local). */
async function loadDoneLessons(): Promise<Set<string>> {
  const g = getGuest();
  const s = await getSession();
  if (!s) return new Set(g?.lessons ?? []);
  const p = await getMyPlayer(s.userId);
  if (!p) return new Set();
  const { data } = await supabase.from('lesson_progress')
    .select('lesson_slug').eq('player_id', p.id);
  return new Set((data ?? []).map((r) => r.lesson_slug as string));
}

export default function AcademyPage() {
  const [done, setDone] = useState<Set<string> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { loadDoneLessons().then(setDone); });
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📚 Academy</h1>
        <p className="text-sm muted">8 cursos de xadrez — funciona offline, progresso sincronizado.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {ACADEMY.map((c) => {
          const total = courseLessons(c).length;
          const pct = done ? courseProgress(c, done) : 0;
          const finished = done ? courseLessons(c).filter((l) => done.has(l.slug)).length : 0;
          return (
            <Link key={c.slug} href={`/academy/${c.slug}`} className="tile p-4">
              <div className="mb-1 flex items-start justify-between">
                <span className="tile-icon text-xl">{c.icon}</span>
                {pct === 100 && <span className="chip gold text-[10px]">✓ Concluído</span>}
              </div>
              <div className="font-bold">{c.title}</div>
              <div className="mb-2 text-xs muted">{c.subtitle} · {total} lições</div>
              <ProgressBar pct={pct} />
              <div className="mt-1 text-[10px] muted">{finished}/{total} lições</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
