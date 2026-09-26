import { ACADEMY_CATEGORIES } from '@/lib/seed';

export default function AcademyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">📚 Kibaúla Academy</h1>
      <p className="mb-6 mt-1 text-sm muted">
        Conteúdo de xadrez ligado ao contexto académico. O foco continua a ser
        xadrez — não é um LMS geral.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACADEMY_CATEGORIES.map((c) => (
          <div key={c.name} className="panel p-5">
            <div className="font-semibold">{c.name}</div>
            <div className="mt-1 text-sm muted">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
