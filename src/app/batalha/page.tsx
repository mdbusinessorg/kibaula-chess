import { getCourses } from '@/lib/data';
import Battle from './Battle';

export const dynamic = 'force-dynamic';

export default async function BatalhaPage() {
  const courses = await getCourses();
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
