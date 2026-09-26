-- Kibaúla Chess — estrutura académica institucional
-- Hierarquia: Institution → Education Type → Course → Class (Turma) → Academic Year → Student

create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

create table if not exists education_types (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) on delete cascade,
  name text not null,
  slug text not null,
  unique (institution_id, slug)
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  education_type_id uuid references education_types(id) on delete cascade,
  name text not null,
  slug text not null,
  abbreviation text not null,
  icon text,
  short_description text,
  archived boolean default false,
  sort_order int default 0,
  unique (education_type_id, slug)
);

create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id) on delete cascade,
  label text not null, -- ex.: '2026'
  starts_on date,
  ends_on date,
  active boolean default true,
  unique (institution_id, label)
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) on delete cascade,
  academic_year_id uuid references academic_years(id) on delete cascade,
  grade_label text,        -- ex.: '13ª'
  name text not null,      -- ex.: 'EM13-A'
  unique (course_id, academic_year_id, name)
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  full_name text not null,
  username text unique not null,
  email text unique,
  rating int not null default 1200,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  puzzles_solved int not null default 0,
  status text not null default 'Estudante',
  inp_verified boolean not null default false, -- só por verificação de admin
  course_id uuid references courses(id),
  class_id uuid references classes(id),
  academic_year_id uuid references academic_years(id),
  created_at timestamptz default now()
);

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,          -- ex.: 'Temporada 2026'
  starts_on date,
  ends_on date,
  active boolean default false,
  champion_player_id uuid references players(id),
  champion_course_id uuid references courses(id),
  created_at timestamptz default now()
);
-- Temporadas antigas nunca são apagadas: histórico preservado.

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id),
  tournament_id uuid,
  white_player_id uuid references players(id),
  black_player_id uuid references players(id),
  result text check (result in ('1-0','0-1','1/2-1/2')),
  played_at timestamptz default now()
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id),
  kind text not null check (kind in ('championship','cup')), -- INP Championship / Kibaúla Cup
  name text not null,
  format jsonb not null default '{"phases":["groups","r16","quarters","semis","final"]}',
  status text not null default 'draft', -- draft|active|finished
  created_at timestamptz default now()
);

alter table matches
  add constraint matches_tournament_fk
  foreign key (tournament_id) references tournaments(id);

create table if not exists tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  course_id uuid references courses(id),
  score numeric default 0
);

create table if not exists ranking_config (
  id int primary key default 1 check (id = 1),
  method text not null default 'avg_rating'
    check (method in ('avg_rating','collective_score','wins','participation','tournaments'))
);

create table if not exists honor_board (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id),
  player_id uuid references players(id),
  achievement text not null,
  created_at timestamptz default now()
);

-- Ranking por curso (método configurável via ranking_config)
create or replace view course_stats as
select
  c.id as course_id,
  c.name, c.slug, c.abbreviation, c.icon,
  count(p.id) as players,
  coalesce(avg(p.rating), 0)::int as avg_rating,
  coalesce(sum(p.wins), 0) as wins,
  coalesce(sum(p.wins + p.losses + p.draws), 0) as games,
  coalesce(sum(p.rating), 0) as collective_score
from courses c
left join players p on p.course_id = c.id
where c.archived = false
group by c.id;

create or replace view class_stats as
select
  cl.id as class_id, cl.name as class_name, cl.grade_label,
  c.id as course_id, c.name as course_name, c.abbreviation,
  count(p.id) as players,
  coalesce(avg(p.rating), 0)::int as avg_rating,
  coalesce(sum(p.wins), 0) as wins,
  coalesce(sum(p.wins + p.losses + p.draws), 0) as games
from classes cl
join courses c on c.id = cl.course_id
left join players p on p.class_id = cl.id
group by cl.id, c.id;
