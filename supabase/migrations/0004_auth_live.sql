-- Kibaúla Chess — autenticação + confrontos ao vivo
-- 0004: ligação players<->auth.users e partidas online em tempo real (sem refazer jogadas)

-- Liga o auth.users ao registo académico do jogador
create index if not exists players_auth_user_id_idx on players (auth_user_id);

-- Trigger: ao criar conta em auth.users, prepara a fila (o player completo é
-- criado/actualizado no onboarding com curso/turma escolhidos pelo aluno)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.players (auth_user_id, full_name, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.email
  )
  on conflict (username) do update
    set auth_user_id = excluded.auth_user_id,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Confrontos ao vivo ----
-- Regra central: jogadas são append-only; nunca se edita/apaga uma jogada
-- (live_matches ao vivo não admite "refazer jogada").

create table if not exists live_matches (
  id uuid primary key default gen_random_uuid(),
  white_player_id uuid references players(id) on delete cascade,
  black_player_id uuid references players(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting','active','finished','aborted')),
  fen text not null default 'start',        -- 'start' = posição inicial
  result text check (result in ('1-0','0-1','1/2-1/2')),
  end_reason text,                          -- checkmate|resign|draw|stalemate|timeout|abandon
  last_move_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists live_moves (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references live_matches(id) on delete cascade,
  ply int not null,                          -- 1,2,3... ordem das jogadas
  san text not null,                         -- notação algébrica
  uci text not null,                         -- ex.: 'e2e4'
  fen_after text not null,
  played_by uuid references players(id),
  played_at timestamptz default now(),
  unique (match_id, ply)                     -- impossível reescrever uma jogada
);

-- realtime
alter publication supabase_realtime add table live_matches;
alter publication supabase_realtime add table live_moves;

-- RLS (fase conceptual: aberto — endurecer em produção)
alter table live_matches enable row level security;
alter table live_moves enable row level security;
create policy public_all on live_matches for all using (true) with check (true);
create policy public_all on live_moves for all using (true) with check (true);
