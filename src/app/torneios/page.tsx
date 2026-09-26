'use client';

import { useEffect, useState } from 'react';
import { getTournaments } from '@/lib/queries';
import type { Tournament } from '@/lib/types';

const PHASE_LABELS: Record<string, string> = {
  groups: 'Fase de Grupos', r16: 'Oitavas', quarters: 'Quartos',
  semis: 'Semifinal', final: 'Final',
};

export default function TorneiosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  useEffect(() => {
    getTournaments().then(setTournaments).catch(() => {});
  }, []);

  const champ = tournaments.filter((t) => t.kind === 'championship');
  const cups = tournaments.filter((t) => t.kind === 'cup');

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">🏆 Kibaúla INP Championship</h1>
        <p className="mb-4 mt-1 text-sm muted">
          Competição institucional. O formato é configurável pelo administrador.
        </p>
        {champ.length === 0 ? (
          <p className="panel p-5 text-sm muted">Ainda sem campeonato criado.</p>
        ) : champ.map((t) => (
          <div key={t.id} className="panel mb-3 p-5">
            <div className="font-semibold">{t.name} <span className="text-xs muted">({t.status})</span></div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs muted">
              {t.format.phases.map((ph, i) => (
                <span key={ph} className="flex items-center gap-2">
                  {i > 0 && '↓'}
                  <span className="rounded border border-[var(--border)] px-2 py-1">
                    {PHASE_LABELS[ph] ?? ph}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h1 className="text-2xl font-bold">🥇 Kibaúla Cup</h1>
        <p className="mb-4 mt-1 text-sm muted">
          Cada curso forma a sua equipa. A competição começa quando o
          administrador a cria — sem resultados inventados.
        </p>
        {cups.length === 0 ? (
          <p className="panel p-5 text-sm muted">Ainda sem copa criada.</p>
        ) : cups.map((t) => (
          <div key={t.id} className="panel mb-3 p-5">
            <div className="font-semibold">{t.name} <span className="text-xs muted">({t.status})</span></div>
          </div>
        ))}
      </section>
    </div>
  );
}
