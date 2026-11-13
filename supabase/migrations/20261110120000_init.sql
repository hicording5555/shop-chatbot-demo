-- 小規模店チャットの公開データと、店舗ごとのRLS。
-- security definer 関数は private スキーマだけに置く（Data API の exposed schemas に private を足さない）。
-- search_path は空に固定し、参照はスキーマ付きにする。
-- 利用者が自分で書き換えられるメタデータは認可に使わない。

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.current_shop_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select members.shop_id
  from public.shop_members as members
  where members.user_id = (select auth.uid());
end;
$$;

create or replace function private.handoff_insert_allowed(target_shop uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  shop_ok boolean;
  recent_count integer;
begin
  select exists (
    select 1
    from public.shops as shop
    where shop.id = target_shop
      and shop.published = true
  ) into shop_ok;

  select count(*)
  into recent_count
  from public.handoff_requests as request
  where request.shop_id = target_shop
    and request.created_at > pg_catalog.now() - interval '1 hour';

  return shop_ok and recent_count < 30;
end;
$$;

-- JS の EFFICACY_CLAIM_SOURCE と同じ。質問文ではなく、答え・案内文面だけを見る。
create or replace function private.contains_efficacy_claim(blob text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(blob, '') ~ '治る|治り|治し|改善|効く|効き|効果がある|完治';
$$;

create or replace function private.reject_seitai_shop_claims()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  blob text;
begin
  if new.industry = 'seitai' then
    blob := concat_ws(
      ' ',
      new.name,
      new.hours,
      new.closed_days,
      new.access_text,
      new.parking,
      new.reservation_label,
      new.extra::text
    );
    if private.contains_efficacy_claim(blob) then
      raise exception 'seitai copy must not claim efficacy' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.reject_seitai_menu_claims()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  industry text;
begin
  select shop.industry into industry
  from public.shops as shop
  where shop.id = new.shop_id;
  if industry = 'seitai' and private.contains_efficacy_claim(concat_ws(' ', new.name, new.price_text, new.detail)) then
    raise exception 'seitai copy must not claim efficacy' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.reject_seitai_faq_claims()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  industry text;
begin
  select shop.industry into industry
  from public.shops as shop
  where shop.id = new.shop_id;
  if industry = 'seitai' and private.contains_efficacy_claim(new.answer) then
    raise exception 'seitai copy must not claim efficacy' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.touch_faq_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function private.current_shop_ids() from public, anon, authenticated, service_role;
revoke all on function private.handoff_insert_allowed(uuid) from public, anon, authenticated, service_role;
revoke all on function private.contains_efficacy_claim(text) from public, anon, authenticated, service_role;
revoke all on function private.reject_seitai_shop_claims() from public, anon, authenticated, service_role;
revoke all on function private.reject_seitai_menu_claims() from public, anon, authenticated, service_role;
revoke all on function private.reject_seitai_faq_claims() from public, anon, authenticated, service_role;
revoke all on function private.touch_faq_updated_at() from public, anon, authenticated, service_role;

grant execute on function private.current_shop_ids() to authenticated;
grant execute on function private.handoff_insert_allowed(uuid) to anon;
grant execute on function private.reject_seitai_shop_claims() to authenticated, service_role;
grant execute on function private.reject_seitai_menu_claims() to authenticated, service_role;
grant execute on function private.reject_seitai_faq_claims() to authenticated, service_role;
grant execute on function private.touch_faq_updated_at() to authenticated, service_role;

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  industry text not null check (industry in ('food', 'salon', 'seitai')),
  name text not null check (char_length(name) between 1 and 80),
  published boolean not null default true,
  phone text not null check (char_length(phone) between 1 and 40),
  email text not null check (char_length(email) between 3 and 120),
  address text not null check (char_length(address) between 1 and 200),
  hours text not null check (char_length(hours) between 1 and 200),
  closed_days text not null check (char_length(closed_days) between 1 and 120),
  access_text text not null check (char_length(access_text) between 1 and 300),
  map_url text not null check (char_length(map_url) between 1 and 300),
  parking text not null check (char_length(parking) between 1 and 300),
  reservation_url text not null check (char_length(reservation_url) between 1 and 300),
  reservation_label text not null check (char_length(reservation_label) between 1 and 120),
  handoff_business_days integer not null default 2 check (handoff_business_days between 1 and 14),
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default pg_catalog.now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 40),
  name text not null check (char_length(name) between 1 and 80),
  price_text text not null check (char_length(price_text) between 1 and 40),
  detail text not null default '' check (char_length(detail) <= 200),
  sort_order integer not null default 0 check (sort_order >= 0)
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 1 and 200),
  answer text not null check (char_length(btrim(answer)) between 1 and 2000),
  keywords text[] not null default '{}',
  published boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint faqs_keywords_count check (cardinality(keywords) <= 20)
);

create table public.handoff_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  customer_name text not null,
  contact text not null,
  question text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint handoff_name_length check (char_length(btrim(customer_name)) between 1 and 80),
  constraint handoff_contact_length check (char_length(btrim(contact)) between 5 and 120),
  constraint handoff_question_length check (char_length(btrim(question)) between 1 and 1000),
  constraint handoff_contact_shape check (
    contact ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or (
      contact ~ '^[0-9+()（）[:space:]-]+$'
      and char_length(regexp_replace(contact, '[^0-9]', '', 'g')) between 10 and 15
    )
  )
);

create table public.shop_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shop_id uuid not null unique references public.shops (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);

create index shops_industry_published_idx on public.shops (industry) where published;
create index menu_items_shop_idx on public.menu_items (shop_id, sort_order);
create index faqs_shop_idx on public.faqs (shop_id, sort_order);
create index handoff_requests_shop_created_idx on public.handoff_requests (shop_id, created_at desc);
create index shop_members_shop_idx on public.shop_members (shop_id);

create trigger shops_reject_seitai_claims
before insert or update on public.shops
for each row execute function private.reject_seitai_shop_claims();

create trigger menu_items_reject_seitai_claims
before insert or update on public.menu_items
for each row execute function private.reject_seitai_menu_claims();

create trigger faqs_reject_seitai_claims
before insert or update on public.faqs
for each row execute function private.reject_seitai_faq_claims();

create trigger faqs_touch_updated_at
before update on public.faqs
for each row execute function private.touch_faq_updated_at();

alter table public.shops enable row level security;
alter table public.menu_items enable row level security;
alter table public.faqs enable row level security;
alter table public.handoff_requests enable row level security;
alter table public.shop_members enable row level security;

alter table public.shops force row level security;
alter table public.menu_items force row level security;
alter table public.faqs force row level security;
alter table public.handoff_requests force row level security;
alter table public.shop_members force row level security;

revoke all on table public.shops from public, anon, authenticated;
revoke all on table public.menu_items from public, anon, authenticated;
revoke all on table public.faqs from public, anon, authenticated;
revoke all on table public.handoff_requests from public, anon, authenticated;
revoke all on table public.shop_members from public, anon, authenticated;

grant select on table public.shops to anon, authenticated;
grant update on table public.shops to authenticated;
grant select, insert, update, delete on table public.shops to service_role;

grant select on table public.menu_items to anon, authenticated;
grant insert, update, delete on table public.menu_items to authenticated;
grant select, insert, update, delete on table public.menu_items to service_role;

grant select on table public.faqs to anon, authenticated;
grant insert, update, delete on table public.faqs to authenticated;
grant select, insert, update, delete on table public.faqs to service_role;

grant insert (shop_id, customer_name, contact, question) on table public.handoff_requests to anon;
grant select on table public.handoff_requests to authenticated;
grant select, insert, update, delete on table public.handoff_requests to service_role;

grant select on table public.shop_members to authenticated;
grant select, insert, update, delete on table public.shop_members to service_role;

create policy shops_anon_select
on public.shops
for select
to anon
using (published = true);

create policy shops_member_select
on public.shops
for select
to authenticated
using (id in (select private.current_shop_ids()));

create policy shops_member_update
on public.shops
for update
to authenticated
using (id in (select private.current_shop_ids()))
with check (id in (select private.current_shop_ids()));

create policy menu_anon_select
on public.menu_items
for select
to anon
using (
  exists (
    select 1
    from public.shops as shop
    where shop.id = menu_items.shop_id
      and shop.published = true
  )
);

create policy menu_member_select
on public.menu_items
for select
to authenticated
using (shop_id in (select private.current_shop_ids()));

create policy menu_member_insert
on public.menu_items
for insert
to authenticated
with check (shop_id in (select private.current_shop_ids()));

create policy menu_member_update
on public.menu_items
for update
to authenticated
using (shop_id in (select private.current_shop_ids()))
with check (shop_id in (select private.current_shop_ids()));

create policy menu_member_delete
on public.menu_items
for delete
to authenticated
using (shop_id in (select private.current_shop_ids()));

create policy faqs_anon_select
on public.faqs
for select
to anon
using (
  published = true
  and exists (
    select 1
    from public.shops as shop
    where shop.id = faqs.shop_id
      and shop.published = true
  )
);

create policy faqs_member_select
on public.faqs
for select
to authenticated
using (shop_id in (select private.current_shop_ids()));

create policy faqs_member_insert
on public.faqs
for insert
to authenticated
with check (shop_id in (select private.current_shop_ids()));

create policy faqs_member_update
on public.faqs
for update
to authenticated
using (shop_id in (select private.current_shop_ids()))
with check (shop_id in (select private.current_shop_ids()));

create policy faqs_member_delete
on public.faqs
for delete
to authenticated
using (shop_id in (select private.current_shop_ids()));

create policy handoff_anon_insert
on public.handoff_requests
for insert
to anon
with check ((select private.handoff_insert_allowed(shop_id)));

create policy handoff_member_select
on public.handoff_requests
for select
to authenticated
using (shop_id in (select private.current_shop_ids()));

create policy shop_members_select_self
on public.shop_members
for select
to authenticated
using (user_id = (select auth.uid()));

comment on schema private is 'RLS helpers. Do not add this schema to Data API exposed schemas.';
comment on table public.handoff_requests is 'Anon may insert only. Anon cannot select. Shop members can read their own rows.';
comment on table public.shop_members is 'Links one auth user to one shop. Writes are done by SQL/dashboard, not by the shop user.';
