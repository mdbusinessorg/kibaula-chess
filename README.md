# ♞ Kibaúla Chess

Plataforma conceptual de xadrez desenvolvida para a comunidade académica do
Instituto Nacional de Petróleos (INP). Projeto conceptual — não é uma aplicação
oficial do INP.

Xadrez + Comunidade + Identidade Académica + Competição + Aprendizagem.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase/PostgreSQL

## Estrutura académica

Institution → Education Type → Course → Class (Turma) → Academic Year → Student

- 8 cursos do Ensino Médio do INP + Formação Profissional (configuráveis no admin)
- Onboarding com selecção de curso; turma escolhida pelo utilizador e verificável pelo admin (✓ INP Verified)
- Rankings: Geral, por Curso, por Turma — método configurável (`ranking_config`)
- Batalha dos Cursos, Kibaúla Season (histórico preservado), INP Championship, Kibaúla Cup
- Honor Board, INP Chess Insights, Community Map, Academy temática
- Admin: gestão académica, importação CSV de alunos, verificação institucional

## Setup

```bash
npm install
npm run dev
```

Sem Supabase configurado a app corre em modo local com o catálogo de cursos
reais e estatísticas a zero (sem números fictícios).

Para ligar à base de dados:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # leitura
SUPABASE_SERVICE_ROLE_KEY=...           # escrita (admin/onboarding)
```

Depois aplica as migrations em `supabase/migrations/` (0001 schema, 0002 seed
com os cursos reais do INP).

## Fontes institucionais

Nomes/categorias baseados nas fontes oficiais do INP (inp.gov.ao). Não é copiado
conteúdo protegido nem identidade visual.
