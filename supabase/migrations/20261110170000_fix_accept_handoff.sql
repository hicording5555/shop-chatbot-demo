-- accept_handoff の ip_hash / window_start が private.handoff_ip_buckets の列と曖昧だったため、
-- 正常な引き継ぎが 42702 で落ちていた。関数だけ差し替える。

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
  if not (
    trimmed_contact ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or (
      trimmed_contact ~ '^[0-9+()（）[:space:]-]+$'
      and char_length(regexp_replace(trimmed_contact, '[^0-9]', '', 'g')) between 10 and 15
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
  if recent_count >= 30 then
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
  values (target_shop, btrim(customer_name), trimmed_contact, btrim(question))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.accept_handoff(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.accept_handoff(uuid, text, text, text, text) to service_role;
