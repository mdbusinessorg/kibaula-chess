-- 0005: controlo de tempo e partidas cotadas nos confrontos ao vivo

alter table live_matches
  add column if not exists time_control_seconds int,   -- segundos por lado; null = sem relógio
  add column if not exists rated boolean not null default true, -- conta para o rating
  add column if not exists draw_offered_by uuid references players(id); -- oferta de empate pendente
