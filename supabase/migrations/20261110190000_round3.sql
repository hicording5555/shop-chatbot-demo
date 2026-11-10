-- 再監査: 店舗上限、ロール判定、標準プランの書き込み、相談申込、掃除。
-- 既に適用したマイグレーションは書き換えない。

create or replace function private.request_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
$$;

revoke all on function private.request_role() from public, anon, authenticated, service_role;
grant execute on function private.request_role() to anon, authenticated, service_role;

create or replace function private.guard_shop_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_name text := private.request_role();
begin
  if role_name in ('anon', 'authenticated')
    and (
      new.industry is distinct from old.industry
      or new.slug is distinct from old.slug
      or new.published is distinct from old.published
      or new.plan is distinct from old.plan
    ) then
    raise exception 'immutable shop column' using errcode = '42501';
  end if;
  if octet_length(new.extra::text) >= 8192 then
    raise exception 'extra too large' using errcode = '23514';
  end if;
  if new.map_url !~ '^https://' or new.reservation_url !~ '^https://' then
    raise exception 'url must be https' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_shop_update() from public, anon, authenticated, service_role;
grant execute on function private.guard_shop_update() to authenticated, service_role;

drop trigger if exists menu_items_reject_ineligible_plan on public.menu_items;
create trigger menu_items_reject_ineligible_plan
before insert or update or delete on public.menu_items
for each row execute function private.reject_ineligible_faq_write();

create or replace function private.neutralize_formula(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when value is null or value = '' then value
    when left(value, 1) in ('=', '+', '-', '@')
      or left(value, 1) = chr(9)
      or left(value, 1) = chr(13)
    then '''' || value
    else value
  end;
$$;

revoke all on function private.neutralize_formula(text) from public, anon, authenticated;
grant execute on function private.neutralize_formula(text) to service_role;

create or replace function public.accept_handoff(
  target_shop uuid,
  customer_name text,
  contact text,
  question text,
  ip_hash text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shop_plan text;
  shop_published boolean;
  recent_count integer;
  bucket_hits integer;
  bucket_window timestamptz := date_trunc('hour', pg_catalog.now());
  new_id uuid;
  trimmed_contact text := btrim(contact);
  digits text;
begin
  if accept_handoff.ip_hash is null
    or char_length(accept_handoff.ip_hash) < 32
    or char_length(accept_handoff.ip_hash) > 128 then
    raise exception 'bad ip hash' using errcode = '22023';
  end if;
  if char_length(btrim(customer_name)) < 1 or char_length(btrim(customer_name)) > 80
    or char_length(trimmed_contact) < 5 or char_length(trimmed_contact) > 120
    or char_length(btrim(question)) < 1 or char_length(btrim(question)) > 1000 then
    raise exception 'invalid handoff' using errcode = '23514';
  end if;
  digits := regexp_replace(trimmed_contact, '[^0-9]', '', 'g');
  if not (
    trimmed_contact ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or (
      trimmed_contact ~ '^[0-9()（）[:space:]-]+$'
      and digits ~ '^0[0-9]{9,10}$'
      and digits !~ '^([0-9])\1+$'
    )
  ) then
    raise exception 'contact_invalid' using errcode = '23514';
  end if;

  select shop.plan, shop.published
  into shop_plan, shop_published
  from public.shops as shop
  where shop.id = target_shop;

  if shop_plan is distinct from 'full' or shop_published is not true then
    raise exception 'handoff unavailable' using errcode = '42501';
  end if;

  select count(*)
  into recent_count
  from public.handoff_requests as request
  where request.shop_id = target_shop
    and request.created_at > pg_catalog.now() - interval '1 hour';
  if recent_count >= 200 then
    raise exception 'rate_limited' using errcode = '23514';
  end if;

  insert into private.handoff_ip_buckets as bucket (ip_hash, window_start, hits)
  values (accept_handoff.ip_hash, bucket_window, 1)
  on conflict on constraint handoff_ip_buckets_pkey
  do update set hits = bucket.hits + 1
  returning bucket.hits into bucket_hits;

  if bucket_hits > 5 then
    raise exception 'rate_limited' using errcode = '23514';
  end if;

  insert into public.handoff_requests (shop_id, customer_name, contact, question)
  values (
    target_shop,
    private.neutralize_formula(btrim(customer_name)),
    private.neutralize_formula(trimmed_contact),
    private.neutralize_formula(btrim(question))
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.accept_handoff(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.accept_handoff(uuid, text, text, text, text) to service_role;

create table if not exists private.consult_ip_buckets (
  ip_hash text not null,
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (ip_hash, window_start)
);

alter table private.consult_ip_buckets enable row level security;
alter table private.consult_ip_buckets force row level security;
revoke all on table private.consult_ip_buckets from public, anon, authenticated;
grant select, insert, update on table private.consult_ip_buckets to service_role;

create table if not exists public.consult_requests (
  id uuid primary key default gen_random_uuid(),
  shop_name text not null,
  industry text not null,
  industry_other text not null default '',
  contact_name text not null,
  email text not null,
  phone text not null default '',
  site_url text not null,
  plan_choice text not null,
  application_kind text not null,
  common_questions text not null default '',
  referrer_name text not null default '',
  wants_video boolean not null default false,
  notes text not null default '',
  newsletter_opt_in boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  constraint consult_shop_name_len check (char_length(btrim(shop_name)) between 1 and 80),
  constraint consult_contact_name_len check (char_length(btrim(contact_name)) between 1 and 80),
  constraint consult_email_len check (char_length(email) between 5 and 120),
  constraint consult_phone_len check (char_length(phone) <= 40),
  constraint consult_url_len check (char_length(site_url) between 8 and 300),
  constraint consult_notes_len check (char_length(notes) <= 2000),
  constraint consult_questions_len check (char_length(common_questions) <= 2000)
);

alter table public.consult_requests enable row level security;
alter table public.consult_requests force row level security;
revoke all on table public.consult_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.consult_requests to service_role;

create or replace function public.accept_consult(
  shop_name text,
  industry text,
  industry_other text,
  contact_name text,
  email text,
  phone text,
  site_url text,
  plan_choice text,
  application_kind text,
  common_questions text,
  referrer_name text,
  wants_video boolean,
  notes text,
  newsletter_opt_in boolean,
  ip_hash text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  global_count integer;
  bucket_hits integer;
  bucket_window timestamptz := date_trunc('hour', pg_catalog.now());
  new_id uuid;
  trimmed_phone text := btrim(coalesce(phone, ''));
  digits text;
begin
  if accept_consult.ip_hash is null
    or char_length(accept_consult.ip_hash) < 32
    or char_length(accept_consult.ip_hash) > 128 then
    raise exception 'bad ip hash' using errcode = '22023';
  end if;
  if industry not in ('美容室・サロン', '整体院', '整骨院・鍼灸院', '飲食店', 'その他') then
    raise exception 'invalid consult' using errcode = '23514';
  end if;
  if plan_choice not in ('ライト', '標準', '充実', 'まだ決めていない') then
    raise exception 'invalid consult' using errcode = '23514';
  end if;
  if application_kind not in ('モニターを希望', '通常の申し込み', 'まず話を聞きたい') then
    raise exception 'invalid consult' using errcode = '23514';
  end if;
  if industry = 'その他' and char_length(btrim(coalesce(industry_other, ''))) < 1 then
    raise exception 'invalid consult' using errcode = '23514';
  end if;
  if site_url !~ '^https://' then
    raise exception 'invalid consult' using errcode = '23514';
  end if;
  if email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'contact_invalid' using errcode = '23514';
  end if;
  if trimmed_phone <> '' then
    digits := regexp_replace(trimmed_phone, '[^0-9]', '', 'g');
    if not (
      trimmed_phone ~ '^[0-9()（）[:space:]-]+$'
      and digits ~ '^0[0-9]{9,10}$'
      and digits !~ '^([0-9])\1+$'
    ) then
      raise exception 'contact_invalid' using errcode = '23514';
    end if;
  end if;

  select count(*) into global_count
  from public.consult_requests as request
  where request.created_at > pg_catalog.now() - interval '1 hour';
  if global_count >= 100 then
    raise exception 'rate_limited' using errcode = '23514';
  end if;

  insert into private.consult_ip_buckets as bucket (ip_hash, window_start, hits)
  values (accept_consult.ip_hash, bucket_window, 1)
  on conflict on constraint consult_ip_buckets_pkey
  do update set hits = bucket.hits + 1
  returning bucket.hits into bucket_hits;

  if bucket_hits > 5 then
    raise exception 'rate_limited' using errcode = '23514';
  end if;

  insert into public.consult_requests (
    shop_name, industry, industry_other, contact_name, email, phone, site_url,
    plan_choice, application_kind, common_questions, referrer_name, wants_video,
    notes, newsletter_opt_in
  ) values (
    private.neutralize_formula(btrim(shop_name)),
    industry,
    private.neutralize_formula(btrim(coalesce(industry_other, ''))),
    private.neutralize_formula(btrim(contact_name)),
    btrim(email),
    private.neutralize_formula(trimmed_phone),
    btrim(site_url),
    plan_choice,
    application_kind,
    private.neutralize_formula(btrim(coalesce(common_questions, ''))),
    private.neutralize_formula(btrim(coalesce(referrer_name, ''))),
    coalesce(wants_video, false),
    private.neutralize_formula(btrim(coalesce(notes, ''))),
    coalesce(newsletter_opt_in, false)
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.accept_consult(
  text, text, text, text, text, text, text, text, text, text, text, boolean, text, boolean, text
) from public, anon, authenticated;
grant execute on function public.accept_consult(
  text, text, text, text, text, text, text, text, text, text, text, boolean, text, boolean, text
) to service_role;

update public.faqs
set question = replace(question, '整体院・治療院', '整体院'),
    answer = replace(answer, '整体院・治療院', '整体院')
where question like '%整体院・治療院%' or answer like '%整体院・治療院%';

update public.shops
set name = replace(name, '整体院・治療院', '整体院'),
    access_text = replace(access_text, '整体院・治療院', '整体院'),
    extra = replace(extra::text, '整体院・治療院', '整体院')::jsonb
where name like '%整体院・治療院%'
   or access_text like '%整体院・治療院%'
   or extra::text like '%整体院・治療院%';

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'delete-old-handoffs') then
      perform cron.unschedule('delete-old-handoffs');
    end if;
    perform cron.schedule(
      'delete-old-handoffs',
      '15 3 * * *',
      $cron$
        delete from public.handoff_requests where created_at < now() - interval '7 days';
        delete from private.handoff_ip_buckets where window_start < now() - interval '1 day';
        delete from private.consult_ip_buckets where window_start < now() - interval '1 day';
      $cron$
    );
  else
    raise notice 'pg_cron が無効です。有効化したあと、このスケジュールを再実行してください。';
  end if;
end $$;
