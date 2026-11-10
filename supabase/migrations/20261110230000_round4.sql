-- 相談の任意URL、長さ、メールの数式対策、上限の記録、90日削除、ライトプランの列。
-- 既に適用したファイルは書き換えない。

alter table public.consult_requests drop constraint if exists consult_url_len;
alter table public.consult_requests add constraint consult_url_len check (char_length(site_url) <= 300);
alter table public.consult_requests drop constraint if exists consult_industry_other_len;
alter table public.consult_requests add constraint consult_industry_other_len check (char_length(industry_other) <= 80);
alter table public.consult_requests drop constraint if exists consult_referrer_len;
alter table public.consult_requests add constraint consult_referrer_len check (char_length(referrer_name) <= 80);
alter table public.consult_requests drop constraint if exists consult_industry_len;
alter table public.consult_requests add constraint consult_industry_len check (char_length(industry) <= 40);
alter table public.consult_requests drop constraint if exists consult_plan_len;
alter table public.consult_requests add constraint consult_plan_len check (char_length(plan_choice) <= 20);
alter table public.consult_requests drop constraint if exists consult_kind_len;
alter table public.consult_requests add constraint consult_kind_len check (char_length(application_kind) <= 40);

create table if not exists private.cap_hits (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('consult_global', 'consult_ip', 'handoff_shop', 'handoff_ip')),
  created_at timestamptz not null default pg_catalog.now()
);

alter table private.cap_hits enable row level security;
alter table private.cap_hits force row level security;
revoke all on table private.cap_hits from public, anon, authenticated;
grant select, insert on table private.cap_hits to service_role;

create or replace function private.guard_shop_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_name text := (select auth.role());
begin
  if role_name in ('anon', 'authenticated')
    and (
      new.industry is distinct from old.industry
      or new.slug is distinct from old.slug
      or new.published is distinct from old.published
      or new.plan is distinct from old.plan
    ) then
    raise exception 'この列は変更できません' using errcode = '42501';
  end if;
  if role_name in ('anon', 'authenticated')
    and old.plan not in ('standard', 'full')
    and (
      new.hours is distinct from old.hours
      or new.closed_days is distinct from old.closed_days
      or new.access_text is distinct from old.access_text
      or new.parking is distinct from old.parking
      or new.map_url is distinct from old.map_url
    ) then
    raise exception 'このプランでは営業時間とアクセスは変更できません' using errcode = '42501';
  end if;
  if role_name in ('anon', 'authenticated')
    and old.plan not in ('standard', 'full')
    and (
      new.reservation_url is distinct from old.reservation_url
      or new.reservation_label is distinct from old.reservation_label
      or new.extra is distinct from old.extra
    ) then
    raise exception 'このプランでは予約ページと補足情報は変更できません' using errcode = '42501';
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
    raise exception 'rate_limited_shop' using errcode = '23514';
  end if;

  insert into private.handoff_ip_buckets as bucket (ip_hash, window_start, hits)
  values (accept_handoff.ip_hash, bucket_window, 1)
  on conflict on constraint handoff_ip_buckets_pkey
  do update set hits = bucket.hits + 1
  returning bucket.hits into bucket_hits;

  if bucket_hits > 5 then
    raise exception 'rate_limited_ip' using errcode = '23514';
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
  trimmed_url text := btrim(coalesce(site_url, ''));
  stored_email text := private.neutralize_formula(btrim(email));
  digits text;
begin
  if accept_consult.ip_hash is null
    or char_length(accept_consult.ip_hash) < 32
    or char_length(accept_consult.ip_hash) > 128 then
    raise exception 'bad ip hash' using errcode = '22023';
  end if;
  if industry not in ('美容室・サロン', '整体院', '整骨院・鍼灸院', '飲食店', 'その他')
    or plan_choice not in ('ライト', '標準', '充実', 'まだ決めていない')
    or application_kind not in ('まず話を聞きたい', 'モニターを希望', '通常の申し込み')
    or char_length(btrim(shop_name)) < 1 or char_length(btrim(shop_name)) > 80
    or char_length(btrim(coalesce(industry_other, ''))) > 80
    or char_length(btrim(contact_name)) < 1 or char_length(btrim(contact_name)) > 80
    or char_length(stored_email) < 5 or char_length(stored_email) > 120
    or char_length(trimmed_phone) > 40
    or char_length(trimmed_url) > 300
    or char_length(btrim(coalesce(common_questions, ''))) > 2000
    or char_length(btrim(coalesce(referrer_name, ''))) > 80
    or char_length(btrim(coalesce(notes, ''))) > 2000 then
    raise exception 'invalid consult' using errcode = '23514';
  end if;
  if industry = 'その他' and char_length(btrim(coalesce(industry_other, ''))) < 1 then
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
    raise exception 'rate_limited_global' using errcode = '23514';
  end if;

  insert into private.consult_ip_buckets as bucket (ip_hash, window_start, hits)
  values (accept_consult.ip_hash, bucket_window, 1)
  on conflict on constraint consult_ip_buckets_pkey
  do update set hits = bucket.hits + 1
  returning bucket.hits into bucket_hits;

  if bucket_hits > 5 then
    raise exception 'rate_limited_ip' using errcode = '23514';
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
    stored_email,
    private.neutralize_formula(trimmed_phone),
    trimmed_url,
    plan_choice,
    application_kind,
    private.neutralize_formula(btrim(coalesce(common_questions, ''))),
    private.neutralize_formula(btrim(coalesce(referrer_name, ''))),
    false,
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
        delete from public.consult_requests where created_at < now() - interval '90 days';
        delete from public.handoff_requests where created_at < now() - interval '7 days';
        delete from private.handoff_ip_buckets where window_start < now() - interval '1 day';
        delete from private.consult_ip_buckets where window_start < now() - interval '1 day';
      $cron$
    );
  else
    raise notice 'pg_cron が無効です。有効化したあと、このスケジュールを再実行してください。';
  end if;
end $$;
