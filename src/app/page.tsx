'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCourses } from '@/lib/queries';
import type { Course } from '@/lib/types';

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    getCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  return (
    <div className="space-y-12">
      <section className="py-10 text-center">
        <p className="mb-2 text-sm uppercase tracking-widest accent">
          Xadrez · Comunidade · Identidade Académica · Competição · Aprendizagem
        </p>
        <h1 className="text-4xl font-bold">
          Kibaúla <span className="accent">Chess</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl muted">
          O espaço digital onde os estudantes do INP jogam, competem, aprendem e
          representam os seus cursos. Formação, excelência, inovação e
          desenvolvimento técnico — transformados num universo de xadrez.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/onboarding" className="btn">Criar a minha conta</Link>
          <Link href="/ranking" className="btn-ghost">Ver ranking</Link>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-bold">8 ÁREAS. UMA COMUNIDADE.</h2>
        <p className="mb-6 text-sm muted">
          Os cursos do Ensino Médio do INP — cada um representado no Kibaúla.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((c) => (
            <Link
              key={c.slug}
              href={`/ranking?curso=${c.slug}`}
              className="panel course-card group p-4 transition hover:border-[var(--accent)]"
            >
              <div className="text-2xl">{c.icon}</div>
              <div className="mt-2 font-semibold uppercase tracking-wide">
                {c.abbreviation}
              </div>
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

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['🏆 Ranking Geral', 'Todos os jogadores do Kibaúla.', '/ranking'],
          ['⚔️ Batalha dos Cursos', 'Curso contra curso, dados reais.', '/batalha'],
          ['🎓 Kibaúla Season', 'Temporadas, campeões e histórico.', '/temporadas'],
        ].map(([t, d, href]) => (
          <Link key={href} href={href} className="panel p-5 hover:border-[var(--accent)]">
            <div className="font-semibold">{t}</div>
            <div className="mt-1 text-sm muted">{d}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
