-- INP CHESS — transformação completa
-- 0007: gamificação (XP/níveis/streak), ratings por controlo de tempo,
-- rating history, progresso da Academy, puzzles, conquistas, chat de partida
--
-- Nota: o conteúdo dos 8 cursos e o banco de puzzles vivem no código
-- (src/lib/academy.ts, src/lib/puzzles.ts) para funcionarem 100% offline;
-- a base guarda apenas progresso/tentativas/XP/conquistas/chat.

-- ---- Perfil de jogador: gamificação + ratings separados ----
alter table players
  add column if not exists xp int not null default 0,
  add column if not exists level int not null default 1,
  add column if not exists streak_days int not null default 0,
  add column if not exists last_active_on date,
  add column if not exists rating_blitz int not null default 1200,
  add column if not exists rating_rapid int not null default 1200,
  add column if not exists rating_classical int not null default 1200,
  add column if not exists rating_puzzle int not null default 1200;

-- Histórico de rating (para gráfico no perfil)
create table if not exists rating_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  match_id uuid,
  kind text not null default 'general',  -- blitz|rapid|classical|puzzle|general
  rating int not null,
  created_at timestamptz not null default now()
);
create index if not exists rating_history_player_idx on rating_history (player_id, created_at);

-- ---- Progresso da Academy (8 cursos; conteúdo no código) ----
create table if not exists lesson_progress (
  player_id uuid not null references players(id) on delete cascade,
  lesson_slug text not null,
  score int,
  completed_at timestamptz not null default now(),
  primary key (player_id, lesson_slug)
);

-- ---- Puzzles (banco local espelhado aqui p/ estatísticas e extensão futura) ----
create table if not exists puzzles (
  slug text primary key,
  title text not null,
  fen text not null,
  solution_uci text[] not null,          -- sequência alternada (solver, adversário, solver…)
  theme text not null default 'tatica',  -- mate1|mate2|mate3|tatica|garfo|cravada|sacrificio|finais|defesa
  rating int not null default 800
);

create table if not exists puzzle_attempts (
  player_id uuid not null references players(id) on delete cascade,
  puzzle_slug text not null references puzzles(slug) on delete cascade,
  solved boolean not null default false,
  attempts int not null default 1,
  played_at timestamptz not null default now(),
  primary key (player_id, puzzle_slug)
);

-- ---- Conquistas ----
create table if not exists achievements (
  code text primary key,
  title text not null,
  description text,
  icon text,
  xp_reward int not null default 25
);

create table if not exists player_achievements (
  player_id uuid not null references players(id) on delete cascade,
  code text not null references achievements(code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (player_id, code)
);

-- ---- Chat na partida ao vivo ----
create table if not exists match_chat (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references live_matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists match_chat_match_idx on match_chat (match_id, created_at);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'match_chat') then
    alter publication supabase_realtime add table match_chat;
  end if;
end $$;

-- ---- RLS (fase conceptual: aberto — endurecer em produção) ----
alter table rating_history enable row level security;
alter table lesson_progress enable row level security;
alter table puzzles enable row level security;
alter table puzzle_attempts enable row level security;
alter table achievements enable row level security;
alter table player_achievements enable row level security;
alter table match_chat enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'rating_history','lesson_progress','puzzles','puzzle_attempts',
    'achievements','player_achievements','match_chat'] loop
    execute format('drop policy if exists public_all on %I', t);
    execute format('create policy public_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ---- Seed: conquistas ----
insert into achievements (code, title, description, icon, xp_reward) values
  ('first_win',    'Primeira Vitória',      'Vence a tua primeira partida.',                    '🏆', 50),
  ('first_live',   'Confronto Online',      'Joga a tua primeira partida ao vivo.',             '🌐', 25),
  ('games_10',     '10 Partidas',           'Completa 10 partidas.',                            '♞',  50),
  ('games_50',     '50 Partidas',           'Completa 50 partidas.',                            '♜', 150),
  ('first_tourney','Primeiro Torneio',      'Participa num torneio.',                           '🏟️', 40),
  ('puzzles_10',   '10 Puzzles',            'Resolve 10 puzzles.',                              '🧩', 50),
  ('puzzles_100',  '100 Puzzles',           'Resolve 100 puzzles.',                             '💎', 300),
  ('streak_7',     '7 Dias de Streak',      'Joga 7 dias seguidos.',                            '🔥', 100),
  ('mate_master',  'Caçador de Mates',      'Resolve 5 puzzles de mate.',                       '⚔️', 60),
  ('endgame_exp',  'Especialista em Finais','Conclui o curso de Finais.',                       '👑', 120),
  ('level_5',      'Nível 5',               'Alcança o nível 5.',                               '⭐', 100),
  ('scholar',      'Estudioso',             'Conclui 10 lições da Academy.',                    '📚', 80)
on conflict (code) do nothing;
