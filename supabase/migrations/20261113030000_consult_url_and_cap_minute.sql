-- 相談URLは http/https だけ。上限の記録は種類ごとに1分へ1行。
-- 相談テーブルは seed に無く、適用時点の本番も空なので、新しい CHECK は既存行を壊さない。
-- 既に適用したファイルは書き換えない。

alter table public.consult_requests drop constraint if exists consult_url_scheme;
alter table public.consult_requests add constraint consult_url_scheme
  check (site_url = '' or site_url ~* '^https?://[^[:space:][:cntrl:]]+$');

create or replace function public.record_cap_hit(p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind is null or p_kind not in ('consult_global', 'consult_ip', 'handoff_shop', 'handoff_ip') then
    raise exception 'invalid cap kind' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('cap-hit'), pg_catalog.hashtext(p_kind));
  insert into private.cap_hits (kind)
  select p_kind
  where not exists (
    select 1
    from private.cap_hits as hit
    where hit.kind = p_kind
      and hit.created_at >= date_trunc('minute', pg_catalog.now())
      and hit.created_at < date_trunc('minute', pg_catalog.now()) + interval '1 minute'
  );
end;
$$;

revoke all on function public.record_cap_hit(text) from public, anon, authenticated;
grant execute on function public.record_cap_hit(text) to service_role;

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
  if trimmed_url <> '' and trimmed_url !~* '^https?://[^[:space:][:cntrl:]]+$' then
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
