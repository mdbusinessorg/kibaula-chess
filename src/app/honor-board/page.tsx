import { getHonorBoard } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HonorBoardPage() {
  const entries = await getHonorBoard();
  return (
    <div>
      <h1 className="text-2xl font-bold">🏅 Kibaúla Honor Board</h1>
      <p className="mb-6 mt-1 text-sm muted">
        Jogadores destacados, melhores desempenhos, campeões e conquistas.
        Quadro próprio do Kibaúla — não é o Quadro de Honra oficial do INP.
      </p>
      {entries.length === 0 ? (
        <p className="panel p-5 text-sm muted">
          O Honor Board será preenchido à medida que a temporada avançar.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={i} className="panel flex items-center gap-3 p-4">
              <span className="accent">★</span>
              <span className="font-semibold">{e.player}</span>
              <span className="text-sm muted">{e.achievement}</span>
              {e.season && <span className="ml-auto text-xs muted">{e.season}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
