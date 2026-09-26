'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getClasses, getCourses, getPlayers, getRankingMethod,
} from '@/lib/queries';
import type { ClassUnit, Course, Player, RankingMethod } from '@/lib/types';
import AdminPanel from './AdminPanel';

export default function AdminPage() {
  const [data, setData] = useState<{
    courses: Course[]; classes: ClassUnit[];
    players: Player[]; method: RankingMethod;
  } | null>(null);

  const reload = useCallback(() => {
    Promise.all([getCourses(), getClasses(), getPlayers(), getRankingMethod()])
      .then(([courses, classes, players, method]) =>
        setData({ courses, classes, players, method }))
      .catch(() => {});
  }, []);

  useEffect(reload, [reload]);

  return (
    <div>
      <h1 className="text-2xl font-bold">⚙️ Kibaúla Admin — Academic Management</h1>
      <p className="mb-6 mt-1 text-sm muted">
        Criar/editar/arquivar cursos, turmas e anos lectivos; mover e verificar
        estudantes; configurar o método do ranking; importar alunos via CSV.
        <span className="block text-xs text-red-400">
          Atenção: em produção esta página deve exigir autenticação de admin.
        </span>
      </p>
      {data ? <AdminPanel {...data} onChange={reload} /> : (
        <p className="muted">A carregar…</p>
      )}
    </div>
  );
}
