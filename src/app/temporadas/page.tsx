'use client';

import { useEffect, useState } from 'react';
import { getSeasons } from '@/lib/queries';
import type { Season } from '@/lib/types';

export default function TemporadasPage() {
  const [seasons, setSeasons] = useState<Season[] | null>(null);
  useEffect(() => {
    getSeasons().then(setSeasons).catch(() => setSeasons([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">🎓 Kibaúla Season</h1>
      <p className="mb-6 mt-1 text-sm muted">
        Temporadas com ranking, torneios, campeões e histórico. Temporadas antigas
        nunca são apagadas.
      </p>
      {seasons === null ? (
        <p className="muted">A carregar…</p>
      ) : seasons.length === 0 ? (
        <p className="panel p-5 text-sm muted">
          Ainda não há temporadas. O administrador cria a primeira (ex.: Temporada 2026).
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {seasons.map((s) => (
            <div key={s.id} className="panel p-5">
              <div className="font-semibold">{s.name}</div>
              <div className="text-sm muted">
                {s.startsOn ?? '—'} → {s.endsOn ?? 'em curso'}
                {s.active && <span className="ml-2 accent">● ativa</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
