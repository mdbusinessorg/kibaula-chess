'use client';

import { useEffect, useState } from 'react';
import { getCourses } from '@/lib/queries';
import type { Course } from '@/lib/types';
import Battle from './Battle';

export default function BatalhaPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => {
    getCourses().then(setCourses).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">⚔️ Kibaúla — Batalha dos Cursos</h1>
      <p className="mb-6 mt-1 text-sm muted">
        Confronto directo entre cursos. Todos os números vêm da base de dados.
      </p>
      <Battle courses={courses} />
    </div>
  );
}
