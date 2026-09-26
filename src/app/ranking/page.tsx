'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getClasses, getCourses, getPlayers } from '@/lib/queries';
import type { ClassUnit, Course, Player } from '@/lib/types';

const MEDAL = ['🥇', '🥈', '🥉'];

function RankingInner() {
  const params = useSearchParams();
  const curso = params.get('curso') ?? undefined;
  const turma = params.get('turma') ?? undefined;
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassUnit[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const course = courses.find((c) => c.slug === curso);

  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
    getClasses().then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    getPlayers({ courseId: course?.id, classId: turma })
      .then(setPlayers).catch(() => setPlayers([]));
  }, [course?.id, turma]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">🏆 Ranking Institucional</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/ranking" className="btn-ghost">Todos</Link>
          {courses.map((c) => (
            <Link key={c.slug} href={`/ranking?curso=${c.slug}`}
              className={`btn-ghost ${curso === c.slug ? 'border-[var(--accent)]' : ''}`}>
              {c.icon} {c.abbreviation}
            </Link>
          ))}
        </div>
        {course && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {classes.filter((cl) => cl.courseId === course.id).map((cl) => (
              <Link key={cl.id}
                href={`/ranking?curso=${course.slug}&turma=${cl.id}`}
                className="btn-ghost">
                {cl.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-semibold">Jogadores</h2>
        {players.length === 0 ? (
          <p className="text-sm muted">Ainda sem jogadores neste recorte.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left muted">
              <tr><th>#</th><th>Jogador</th><th>Curso</th><th>Turma</th><th>Rating</th><th>V/E/D</th></tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="py-2">{MEDAL[i] ?? i + 1}</td>
                  <td>
                    <Link className="hover:underline" href={`/perfil?u=${p.username}`}>
                      {p.fullName}
                    </Link>
                    {p.inpVerified && <span className="ml-1 text-xs accent">✓ INP Verified</span>}
                  </td>
                  <td className="muted">{p.courseAbbr ?? '—'}</td>
                  <td className="muted">{p.className ?? '—'}</td>
                  <td className="font-semibold">{p.rating}</td>
                  <td className="muted">{p.wins}/{p.draws}/{p.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-semibold">🎓 Ranking dos Cursos</h2>
        <ol className="space-y-2">
          {courses.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 text-sm">
              <span>{MEDAL[i] ?? `${i + 1}.`}</span>
              <span>{c.icon} {c.name}</span>
              <span className="ml-auto muted">
                {c.players} jogadores · média {c.avgRating || '—'} · {c.wins} vitórias
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-semibold">🏫 Ranking por Turma</h2>
        {classes.length === 0 ? (
          <p className="text-sm muted">Ainda sem turmas registadas.</p>
        ) : (
          <ol className="space-y-2">
            {[...classes].sort((a, b) => b.avgRating - a.avgRating).map((cl, i) => (
              <li key={cl.id} className="flex items-center gap-3 text-sm">
                <span>{MEDAL[i] ?? `${i + 1}.`}</span>
                <span>{cl.name} <span className="muted">({cl.courseAbbr})</span></span>
                <span className="ml-auto muted">
                  {cl.players} jogadores · média {cl.avgRating || '—'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export default function RankingPage() {
  return (
    <Suspense fallback={<p className="muted">A carregar…</p>}>
      <RankingInner />
    </Suspense>
  );
}
