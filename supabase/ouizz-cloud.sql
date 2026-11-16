-- Sauvegarde en ligne des quiz Ouizz (projet Supabase de Road2Fit, tables préfixées ouizz_).
-- Accès uniquement par fonctions + « code de sauvegarde » secret (on ne stocke que son empreinte SHA-256).
-- La table elle-même est fermée (RLS sans politique, aucun droit pour anon).

create table if not exists public.ouizz_quizzes (
  owner text not null,              -- sha256(code de sauvegarde)
  id text not null,                 -- id du quiz
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null,       -- ms (horloge du navigateur)
  deleted boolean not null default false,
  primary key (owner, id)
);
alter table public.ouizz_quizzes enable row level security;
revoke all on public.ouizz_quizzes from anon, authenticated;

create or replace function public.ouizz_owner(secret text) returns text
language plpgsql immutable set search_path = public, extensions as $$
begin
  if secret is null or length(secret) < 20 then
    raise exception 'code de sauvegarde invalide';
  end if;
  return encode(extensions.digest(secret, 'sha256'), 'hex');
end $$;

create or replace function public.ouizz_list(secret text)
returns table (id text, title text, updated_at bigint, deleted boolean)
language sql security definer set search_path = public, extensions as $$
  select q.id, q.title, q.updated_at, q.deleted from public.ouizz_quizzes q where q.owner = public.ouizz_owner(secret);
$$;

create or replace function public.ouizz_get(secret text, ids text[])
returns setof jsonb
language sql security definer set search_path = public, extensions as $$
  select q.data from public.ouizz_quizzes q
  where q.owner = public.ouizz_owner(secret) and q.id = any(ids) and not q.deleted;
$$;

create or replace function public.ouizz_put(secret text, quiz jsonb)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  o text := public.ouizz_owner(secret);
  qid text := quiz->>'id';
  upd bigint := coalesce((quiz->>'updatedAt')::bigint, (extract(epoch from now()) * 1000)::bigint);
begin
  if qid is null or length(qid) > 64 then raise exception 'quiz sans identifiant'; end if;
  if octet_length(quiz::text) > 20000000 then raise exception 'quiz trop volumineux (20 Mo max)'; end if;
  if (select count(*) from public.ouizz_quizzes where owner = o) >= 1000
     and not exists (select 1 from public.ouizz_quizzes where owner = o and id = qid) then
    raise exception 'trop de quiz (1000 max)';
  end if;
  insert into public.ouizz_quizzes as t (owner, id, title, data, updated_at, deleted)
  values (o, qid, coalesce(quiz->>'title', ''), quiz, upd, false)
  on conflict (owner, id) do update
    set title = excluded.title, data = excluded.data, updated_at = excluded.updated_at, deleted = false
    where t.updated_at <= excluded.updated_at;
end $$;

create or replace function public.ouizz_delete(secret text, quiz_id text, at bigint)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare o text := public.ouizz_owner(secret);
begin
  insert into public.ouizz_quizzes as t (owner, id, title, data, updated_at, deleted)
  values (o, quiz_id, '', '{}'::jsonb, at, true)
  on conflict (owner, id) do update
    set data = '{}'::jsonb, deleted = true, updated_at = excluded.updated_at
    where t.updated_at <= excluded.updated_at;
end $$;

revoke all on function public.ouizz_owner(text) from public;
revoke all on function public.ouizz_list(text) from public;
revoke all on function public.ouizz_get(text, text[]) from public;
revoke all on function public.ouizz_put(text, jsonb) from public;
revoke all on function public.ouizz_delete(text, text, bigint) from public;
grant execute on function public.ouizz_list(text) to anon, authenticated;
grant execute on function public.ouizz_get(text, text[]) to anon, authenticated;
grant execute on function public.ouizz_put(text, jsonb) to anon, authenticated;
grant execute on function public.ouizz_delete(text, text, bigint) to anon, authenticated;
