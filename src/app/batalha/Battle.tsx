'use client';

import { useState } from 'react';
import type { Course } from '@/lib/types';

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs muted">
        <span>{label}</span><span>{value}</span>
      </div>
      <div className="h-3 rounded bg-[#0d141c]">
        <div className="h-3 rounded bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Battle({ courses }: { courses: Course[] }) {
  const [a, setA] = useState(courses[0]?.id ?? '');
  const [b, setB] = useState(courses[1]?.id ?? '');
  const ca = courses.find((c) => c.id === a);
  const cb = courses.find((c) => c.id === b);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <select value={a} onChange={(e) => setA(e.target.value)}>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-xl font-bold accent">VS</span>
        <select value={b} onChange={(e) => setB(e.target.value)}>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {ca && cb && ca.id !== cb.id ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[ca, cb].map((c) => (
            <div key={c.id} className="panel space-y-3 p-5">
              <div className="text-lg font-semibold uppercase">
                {c.icon} {c.abbreviation}
              </div>
              <div className="text-sm muted">{c.name}</div>
              <Bar label="Jogadores" value={c.players} max={Math.max(ca.players, cb.players, 1)} />
              <Bar label="Rating coletivo" value={c.collectiveScore} max={Math.max(ca.collectiveScore, cb.collectiveScore, 1)} />
              <Bar label="Vitórias" value={c.wins} max={Math.max(ca.wins, cb.wins, 1)} />
              <Bar label="Partidas" value={c.games} max={Math.max(ca.games, cb.games, 1)} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm muted">Escolhe dois cursos diferentes.</p>
      )}
    </div>
  );
}
