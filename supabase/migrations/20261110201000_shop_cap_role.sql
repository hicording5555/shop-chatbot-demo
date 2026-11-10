-- ライブの accept_handoff は店舗あたり 30 件で止まる。ここから先は 200 件。
-- guard_shop_update は security definer なので current_user ではロールを見ない。
-- 既に適用したファイルは書き換えない。

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
    raise exception 'immutable shop column' using errcode = '42501';
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
    raise exception 'standard plan required' using errcode = '42501';
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
