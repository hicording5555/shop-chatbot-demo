-- 引き継ぎの直接INSERTをやめ、プランと列の更新を制限する。
-- 適用は 20261110120000_init.sql と seed.sql のあと。

alter table public.shops
  add column if not exists plan text not null default 'light';

alter table public.shops
  drop constraint if exists shops_plan_check;

alter table public.shops
  add constraint shops_plan_check check (plan in ('light', 'standard', 'full'));

update public.shops
set plan = 'full'
where slug in ('komorebi', 'lumiere', 'yasuragi');

update public.shops
set
  reservation_label = 'ネット予約のページを開く',
  reservation_url = 'https://shop-chatbot-demo-0lf2.onrender.com/reserve/' || slug,
  map_url = case slug
    when 'komorebi' then 'https://www.openstreetmap.org/search?query=%E6%9E%B6%E7%A9%BA%E7%9C%8C%E6%9E%B6%E7%A9%BA%E5%B8%82%E3%81%93%E3%82%82%E3%82%8C%E3%81%B3%E7%94%BA'
    when 'lumiere' then 'https://www.openstreetmap.org/search?query=%E6%9E%B6%E7%A9%BA%E7%9C%8C%E6%9E%B6%E7%A9%BA%E5%B8%82%E3%83%AB%E3%83%9F%E3%82%A8%E3%83%BC%E3%83%AB%E7%94%BA'
    when 'yasuragi' then 'https://www.openstreetmap.org/search?query=%E6%9E%B6%E7%A9%BA%E7%9C%8C%E6%9E%B6%E7%A9%BA%E5%B8%82%E3%82%84%E3%81%99%E3%82%89%E3%81%8E%E7%94%BA'
    else map_url
  end
where slug in ('komorebi', 'lumiere', 'yasuragi');

update public.faqs
set question = '子ども連れでも利用できますか？',
    answer = 'はい、ご利用いただけます。子ども用の椅子と取り分け皿をご用意しています。'
where id = '11111111-1111-4111-8111-000000000004';

update public.faqs
set question = 'アレルギーへの対応はありますか？'
where id = '11111111-1111-4111-8111-000000000005';

update public.faqs
set question = '支払い方法を教えてください'
where id in (
  '11111111-1111-4111-8111-000000000006',
  '22222222-2222-4222-8222-000000000006',
  '33333333-3333-4333-8333-000000000006'
);

update public.faqs
set question = 'カットの所要時間はどれくらいですか？'
where id = '22222222-2222-4222-8222-000000000002';

update public.faqs
set question = '初めてですが、何を持っていけばいいですか？'
where id = '33333333-3333-4333-8333-000000000001';

update public.faqs
set question = 'どれくらいの間隔で通えばいいですか？',
    answer = '通う間隔は、お一人おひとりのご希望やご都合に合わせて、カウンセリングで施術者とご相談のうえ決めていただけます。',
    keywords = array['頻度', '間隔', '通院']::text[]
where id = '33333333-3333-4333-8333-000000000003';

update public.faqs
set answer = '当院は完全予約制です。下のボタンからご予約ください。お電話でも承ります。'
where id = '33333333-3333-4333-8333-000000000005';

update public.shops
set extra = jsonb_set(
  extra,
  '{firstVisit}',
  to_jsonb('はじめての方へのご案内です。ご予約はネット予約のページからどうぞ。当日は動きやすい服装でお越しください。お着替えもご用意しています。カウンセリングで、お体の気になるところやご希望を伺います。初回料金はカウンセリング＋整体（60分）5,500円です。'::text)
)
where slug = 'yasuragi';

update public.faqs
set question = '予約はできますか？',
    answer = 'はい、ご予約いただけます。下のボタンからネット予約のページへお進みください。'
where id = '11111111-1111-4111-8111-000000000001';

create table if not exists private.handoff_ip_buckets (
  ip_hash text not null,
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (ip_hash, window_start)
);

alter table private.handoff_ip_buckets enable row level security;
alter table private.handoff_ip_buckets force row level security;

revoke all on table private.handoff_ip_buckets from public, anon, authenticated;
grant select, insert, update on table private.handoff_ip_buckets to service_role;

create or replace function private.member_can_edit_faqs(target_shop uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shop_members as members
    join public.shops as shop on shop.id = members.shop_id
    where members.user_id = (select auth.uid())
      and members.shop_id = target_shop
      and shop.plan in ('standard', 'full')
  );
$$;

revoke all on function private.member_can_edit_faqs(uuid) from public, anon, authenticated, service_role;
grant execute on function private.member_can_edit_faqs(uuid) to authenticated;

create or replace function private.reject_ineligible_faq_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_shop uuid := coalesce(new.shop_id, old.shop_id);
begin
  if current_user in ('anon', 'authenticated')
    and not private.member_can_edit_faqs(target_shop) then
    raise exception 'faq write not allowed for this plan' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function private.reject_ineligible_faq_write() from public, anon, authenticated, service_role;
grant execute on function private.reject_ineligible_faq_write() to authenticated, service_role;

drop trigger if exists faqs_reject_ineligible_plan on public.faqs;
create trigger faqs_reject_ineligible_plan
before insert or update or delete on public.faqs
for each row execute function private.reject_ineligible_faq_write();

create or replace function private.guard_shop_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
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

drop trigger if exists shops_guard_update on public.shops;
create trigger shops_guard_update
before update on public.shops
for each row execute function private.guard_shop_update();

drop policy if exists handoff_anon_insert on public.handoff_requests;
revoke insert on table public.handoff_requests from anon;
revoke execute on function private.handoff_insert_allowed(uuid) from anon;

revoke update on table public.shops from authenticated;
grant update (
  name,
  phone,
  email,
  address,
  hours,
  closed_days,
  access_text,
  map_url,
  parking,
  reservation_url,
  reservation_label,
  handoff_business_days,
  extra
) on table public.shops to authenticated;

grant delete on table public.handoff_requests to authenticated;

drop policy if exists handoff_member_delete on public.handoff_requests;
create policy handoff_member_delete
on public.handoff_requests
for delete
to authenticated
using (shop_id in (select private.current_shop_ids()));

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
  window_start timestamptz := date_trunc('hour', pg_catalog.now());
  new_id uuid;
begin
  if ip_hash is null or char_length(ip_hash) < 32 or char_length(ip_hash) > 128 then
    raise exception 'bad ip hash' using errcode = '22023';
  end if;
  if char_length(btrim(customer_name)) < 1 or char_length(btrim(customer_name)) > 80
    or char_length(btrim(contact)) < 5 or char_length(btrim(contact)) > 120
    or char_length(btrim(question)) < 1 or char_length(btrim(question)) > 1000 then
    raise exception 'invalid handoff' using errcode = '23514';
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
    raise exception 'shop busy' using errcode = '23514';
  end if;

  insert into private.handoff_ip_buckets as bucket (ip_hash, window_start, hits)
  values (ip_hash, window_start, 1)
  on conflict (ip_hash, window_start)
  do update set hits = bucket.hits + 1
  returning hits into bucket_hits;

  if bucket_hits > 5 then
    raise exception 'rate limited' using errcode = '23514';
  end if;

  insert into public.handoff_requests (shop_id, customer_name, contact, question)
  values (target_shop, btrim(customer_name), btrim(contact), btrim(question))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.accept_handoff(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.accept_handoff(uuid, text, text, text, text) to service_role;
grant usage on schema private to service_role;

-- pg_cron は Supabase の無料枠に含まれる。拡張が無い環境では通知だけ出して続ける。
do $$
begin
  create extension if not exists pg_cron;
exception
  when others then
    raise notice 'pg_cron を作成できませんでした（%）。Dashboard の Database → Extensions で pg_cron を有効にしてから、このファイル末尾の schedule を再実行してください。', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'delete-old-handoffs') then
      perform cron.unschedule('delete-old-handoffs');
    end if;
    perform cron.schedule(
      'delete-old-handoffs',
      '15 3 * * *',
      $cron$delete from public.handoff_requests where created_at < now() - interval '7 days'$cron$
    );
  end if;
end $$;
