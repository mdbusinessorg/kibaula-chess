'use client';

import { useState } from 'react';
import type { ClassUnit, Course, Player, RankingMethod } from '@/lib/types';

const METHODS: { value: RankingMethod; label: string }[] = [
  { value: 'avg_rating', label: 'Rating médio' },
  { value: 'collective_score', label: 'Pontuação coletiva' },
  { value: 'wins', label: 'Número de vitórias' },
  { value: 'participation', label: 'Participação' },
  { value: 'tournaments', label: 'Torneios' },
];

async function call(action: string, payload: Record<string, unknown>) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error);
  return body;
}

export default function AdminPanel({
  courses, classes, players, method,
}: {
  courses: Course[]; classes: ClassUnit[];
  players: Player[]; method: RankingMethod;
}) {
  const [msg, setMsg] = useState('');
  const [csv, setCsv] = useState('');
  const [importResult, setImportResult] = useState<
    { row: string; ok: boolean; error?: string }[] | null>(null);

  const run = (fn: () => Promise<unknown>) =>
    fn()
      .then(() => { setMsg('OK — atualizado.'); })
      .catch((e) => setMsg(`Erro: ${e.message}`));

  return (
    <div className="space-y-6">
      {msg && <p className="text-sm accent">{msg}</p>}

      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Método do Ranking dos Cursos</h2>
        <div className="flex gap-2">
          <select id="method" defaultValue={method}>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button className="btn text-sm" onClick={() => run(() =>
            call('setRankingMethod', {
              method: (document.getElementById('method') as HTMLSelectElement).value,
            }))}>Guardar</button>
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Criar Curso</h2>
        <form className="grid gap-2 sm:grid-cols-4" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() => call('createCourse', {
            name: f.get('name'), slug: f.get('slug'),
            abbreviation: f.get('abbr'), icon: f.get('icon'),
            educationType: f.get('etype'),
          }));
        }}>
          <input name="name" placeholder="Nome" required />
          <input name="slug" placeholder="slug" required />
          <input name="abbr" placeholder="Abreviação" required />
          <input name="icon" placeholder="Ícone (emoji)" />
          <select name="etype">
            <option value="ensino-medio">Ensino Médio</option>
            <option value="formacao-profissional">Formação Profissional</option>
          </select>
          <button className="btn text-sm">Criar</button>
        </form>
        <div className="flex flex-wrap gap-2 text-xs">
          {courses.map((c) => (
            <span key={c.id} className="rounded border border-[var(--border)] px-2 py-1">
              {c.icon} {c.abbreviation}
              <button className="ml-2 text-red-400" onClick={() => run(() =>
                call('archiveCourse', { courseId: c.id, archived: true }))}>
                arquivar
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Criar Turma</h2>
        <form className="grid gap-2 sm:grid-cols-4" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() => call('createClass', {
            courseId: f.get('course'), name: f.get('name'), gradeLabel: f.get('grade'),
          }));
        }}>
          <select name="course" required>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input name="grade" placeholder="Classe (ex.: 13ª)" />
          <input name="name" placeholder="Turma (ex.: EM13-A)" required />
          <button className="btn text-sm">Criar</button>
        </form>
        <div className="flex flex-wrap gap-2 text-xs muted">
          {classes.map((cl) => (
            <span key={cl.id} className="rounded border border-[var(--border)] px-2 py-1">
              {cl.name} ({cl.courseAbbr})
            </span>
          ))}
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Ano Lectivo</h2>
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() => call('createAcademicYear', { label: f.get('label') }));
        }}>
          <input name="label" placeholder="ex.: 2026" required />
          <button className="btn text-sm">Criar</button>
        </form>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Estudantes</h2>
        {players.length === 0 ? (
          <p className="text-sm muted">Sem estudantes registados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left muted">
              <tr><th>Nome</th><th>Curso</th><th>Turma</th><th>Verificado</th><th></th></tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="py-2">{p.fullName}</td>
                  <td>{p.courseAbbr ?? '—'}</td>
                  <td>{p.className ?? '—'}</td>
                  <td>{p.inpVerified ? '✓' : '—'}</td>
                  <td>
                    <button className="btn-ghost text-xs" onClick={() => run(() =>
                      call('verifyStudent', { playerId: p.id, verified: !p.inpVerified }))}>
                      {p.inpVerified ? 'Remover verificação' : 'Verificar (INP ✓)'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Importar Alunos (CSV)</h2>
        <p className="text-xs muted">
          Formato: Nome,Username,Email,Curso(slug),Classe,Turma,Ano Lectivo,Status
        </p>
        <textarea
          className="h-32 w-full rounded border border-[var(--border)] bg-[#0d141c] p-3 text-xs"
          value={csv} onChange={(e) => setCsv(e.target.value)}
          placeholder={'Matias Domingos,matias,matias@exemplo.com,electromecanica,13ª,EM13-A,2026,Estudante'}
        />
        <button className="btn text-sm" onClick={() =>
          call('importStudents', { csv })
            .then((b) => setImportResult(b.results))
            .catch((e) => setMsg(`Erro: ${e.message}`))}>
          Importar
        </button>
        {importResult && (
          <ul className="text-xs">
            {importResult.map((r, i) => (
              <li key={i} className={r.ok ? 'text-green-400' : 'text-red-400'}>
                {r.row}: {r.ok ? 'importado' : r.error}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Criar Temporada / Torneio</h2>
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() => call('createSeason', { name: f.get('sname'), active: true }));
        }}>
          <input name="sname" placeholder="Temporada 2026" required />
          <button className="btn text-sm">Criar temporada</button>
        </form>
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          run(() => call('createTournament', {
            kind: f.get('kind'), name: f.get('tname'),
          }));
        }}>
          <select name="kind">
            <option value="championship">INP Championship</option>
            <option value="cup">Kibaúla Cup</option>
          </select>
          <input name="tname" placeholder="Nome do torneio" required />
          <button className="btn text-sm">Criar torneio</button>
        </form>
      </section>
    </div>
  );
}
