import { getClasses, getCourses, getPlayers, getRankingMethod } from '@/lib/data';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [courses, classes, players, method] = await Promise.all([
    getCourses(), getClasses(), getPlayers(), getRankingMethod(),
  ]);
  return (
    <div>
      <h1 className="text-2xl font-bold">⚙️ Kibaúla Admin — Academic Management</h1>
      <p className="mb-6 mt-1 text-sm muted">
        Criar/editar/arquivar cursos, turmas e anos lectivos; mover e verificar
        estudantes; configurar o método do ranking; importar alunos via CSV.
      </p>
      <AdminPanel
        courses={courses} classes={classes} players={players} method={method}
      />
    </div>
  );
}
