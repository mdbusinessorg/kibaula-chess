'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getClasses, getCourses, getPlayers } from '@/lib/queries';
import type { ClassUnit, Course, Player } from '@/lib/types';

export default function ComunidadePage() {
  const [data, setData] = useState<{
    courses: Course[]; classes: ClassUnit[]; players: Player[];
  } | null>(null);

  useEffect(() => {
    Promise.all([getCourses(), getClasses(), getPlayers()])
      .then(([courses, classes, players]) => setData({ courses, classes, players }))
      .catch(() => setData({ courses: [], classes: [], players: [] }));
  }, []);

  if (!data) return <p className="muted">A carregar…</p>;
  const { courses, classes, players } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold">🌍 The INP Chess Community</h1>
      <p className="mb-6 mt-1 text-sm muted">Curso → Turmas → Jogadores.</p>
      <div className="space-y-6">
        {courses.map((c) => {
          const courseClasses = classes.filter((cl) => cl.courseId === c.id);
          const coursePlayers = players.filter((p) => p.courseId === c.id);
          return (
            <section key={c.id} className="panel p-5">
              <h2 className="font-semibold">
                {c.icon} {c.name}{' '}
                <span className="text-xs muted">({c.players} jogadores)</span>
              </h2>
              {courseClasses.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {courseClasses.map((cl) => (
                    <span key={cl.id} className="rounded border border-[var(--border)] px-2 py-1 text-xs">
                      {cl.name} · {cl.players}
                    </span>
                  ))}
                </div>
              )}
              {coursePlayers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {coursePlayers.map((p) => (
                    <Link key={p.id} href={`/perfil?u=${p.username}`}
                      className="rounded bg-[#0d141c] px-2 py-1 hover:underline">
                      {p.fullName} <span className="muted">({p.rating})</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
