import { getClasses, getCourses, getPlayers, getTournaments } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const [courses, classes, players, tournaments] = await Promise.all([
    getCourses(), getClasses(), getPlayers(), getTournaments(),
  ]);
  const totalGames = players.reduce((s, p) => s + p.wins + p.losses + p.draws, 0);
  const totalPuzzles = players.reduce((s, p) => s + p.puzzlesSolved, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">📊 INP Chess Insights</h1>
      <p className="mb-6 mt-1 text-sm muted">Dados reais da plataforma.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Participação', `${players.length} alunos registados`],
          ['Engagement', `${totalGames} partidas no total`],
          ['Cursos', `${courses.filter((c) => c.players > 0).length} cursos com participação`],
          ['Turmas', `${classes.filter((c) => c.players > 0).length} turmas com jogadores`],
          ['Competição', `${tournaments.length} torneios`],
          ['Aprendizagem', `${totalPuzzles} puzzles resolvidos`],
        ].map(([t, v]) => (
          <div key={t} className="panel p-5">
            <div className="text-xs uppercase tracking-wide muted">{t}</div>
            <div className="mt-1 font-semibold">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
