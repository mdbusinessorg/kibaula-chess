-- handle_new_user: ligar conta auth a registo de jogador existente (mesmo email)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.players (auth_user_id, full_name, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Jogador'),
    coalesce(new.raw_user_meta_data->>'username', 'player_' || left(new.id::text, 8)),
    new.email
  )
  on conflict (email) do update set auth_user_id = excluded.auth_user_id;
  return new;
end;
$$;
