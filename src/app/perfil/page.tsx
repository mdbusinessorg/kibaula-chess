'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPlayer } from '@/lib/queries';
import type { Player } from '@/lib/types';

function PerfilInner() {
  const params = useSearchParams();
  const username = params.get('u');
  const [p, setP] = useState<Player | null | undefined>(undefined);

  useEffect(() => {
    if (!username) { setP(null); return; }
    getPlayer(username).then(setP).catch(() => setP(null));
  }, [username]);

  if (p === undefined) return <p className="muted">A carregar…</p>;
  if (!p) return <p className="muted">Jogador não encontrado.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{p.fullName}</h1>
            <p className="muted">@{p.username}</p>
          </div>
          {p.inpVerified && (
            <span className="rounded border border-[var(--accent)] px-2 py-1 text-xs accent">
              ✓ INP Verified
            </span>
          )}
        </div>
        <div className="mt-4 text-sm">
          <div>{p.courseName ?? 'Sem curso'}</div>
          {p.className && <div className="muted">Turma: {p.className}</div>}
          <div className="mt-2 text-lg font-semibold accent">
            Kibaúla Rating: {p.rating}
          </div>
          <div className="muted">
            {p.wins}V · {p.draws}E · {p.losses}D · {p.puzzlesSolved} puzzles
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="mb-3 font-semibold">Perfil Académico</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="muted">Instituição</dt><dd>Instituto Nacional de Petróleos</dd>
          <dt className="muted">Curso</dt><dd>{p.courseName ?? '—'}</dd>
          <dt className="muted">Classe</dt><dd>{p.gradeLabel ?? '—'}</dd>
          <dt className="muted">Turma</dt><dd>{p.className ?? '—'}</dd>
          <dt className="muted">Ano lectivo</dt><dd>{p.academicYear ?? '—'}</dd>
          <dt className="muted">Status</dt><dd>{p.status}</dd>
        </dl>
      </section>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={<p className="muted">A carregar…</p>}>
      <PerfilInner />
    </Suspense>
  );
}
