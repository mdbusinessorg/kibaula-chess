-- RLS: conceito/demo — políticas abertas para a app funcionar sem backend.
-- TODO produção: restringir escrita (admin) a utilizadores autenticados com role admin.
do $$
declare t text;
begin
  foreach t in array array[
    'institutions','education_types','courses','classes','academic_years',
    'players','seasons','tournaments','matches','tournament_teams',
    'ranking_config','honor_board'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy public_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;
