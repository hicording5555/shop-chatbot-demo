import { readdirSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const prelude = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  email_confirmed_at timestamptz
);
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  );
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant anon, authenticated, service_role to current_user;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role, current_user;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.role() to anon, authenticated, service_role;
`;

const users = `
insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'komorebi.demo@example.com', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'lumiere.demo@example.com', now()),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'yasuragi.demo@example.com', now());
`;

const db = new PGlite();
await db.exec(prelude);
const migrations = readdirSync(new URL('supabase/migrations/', root))
  .filter((name) => name.endsWith('.sql'))
  .sort();
for (const name of migrations) {
  await db.exec(read(`supabase/migrations/${name}`));
}
await db.exec(read('supabase/seed.sql'));
await db.exec(users);
await db.exec(read('supabase/seed_members.sql'));
await db.exec(read('supabase/tests/rls_isolation.sql'));

const shops = await db.query('select count(*)::int as n from public.shops');
if (shops.rows[0].n !== 3) {
  throw new Error(`seed was not rolled back cleanly: shops=${shops.rows[0].n}`);
}
console.log('RLS isolation script passed against embedded Postgres.');
