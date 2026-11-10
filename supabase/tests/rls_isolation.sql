-- 店舗をまたいだ読み書きができないことを確認する。
-- 実行順: migration → seed.sql → 認証ユーザー作成 → seed_members.sql → このファイル。
-- SQLエディタでスクリプト全体を一度に実行する。成功してもロールバックされ、データは残らない。
-- 失敗時は RLS TEST FAILED で止まる。
--
-- プレースホルダの認証UUID（seed_members.sql のコメントと同じ）:
--   aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1 飲食
--   aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2 美容
--   aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3 整体
-- 実際の sub は shop_members から読むので、Dashboard が採番した UUID でもこのテストは動く。

begin;

create or replace function public._rls_expect(cond boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(cond, false) then
    raise exception 'RLS TEST FAILED: %', message;
  end if;
end;
$$;

create or replace function public._rls_as(target_user text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', target_user, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', target_user, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

grant execute on function public._rls_expect(boolean, text) to anon, authenticated;
grant execute on function public._rls_as(text) to anon, authenticated;

do $$
declare
  linked integer;
begin
  select count(*) into linked
  from public.shop_members as members
  join public.shops as shop on shop.id = members.shop_id
  where shop.slug in ('komorebi', 'lumiere', 'yasuragi');
  if linked <> 3 then
    raise exception 'RLS TEST FAILED: shop_members が3件ありません（今 % 件）。seed_members.sql を先に実行してください。', linked;
  end if;
end $$;

select set_config('test.food_user', (
  select members.user_id::text
  from public.shop_members as members
  join public.shops as shop on shop.id = members.shop_id
  where shop.slug = 'komorebi'
), true);
select set_config('test.salon_user', (
  select members.user_id::text
  from public.shop_members as members
  join public.shops as shop on shop.id = members.shop_id
  where shop.slug = 'lumiere'
), true);
select set_config('test.seitai_user', (
  select members.user_id::text
  from public.shop_members as members
  join public.shops as shop on shop.id = members.shop_id
  where shop.slug = 'yasuragi'
), true);

set local role authenticated;
select public._rls_as(current_setting('test.food_user'));

select public._rls_expect((select count(*) from public.faqs) = 7, 'food user should see only 7 faqs');
select public._rls_expect(
  (select count(*) from public.faqs where shop_id = '22222222-2222-4222-8222-222222222222') = 0,
  'food user can see salon faqs'
);
select public._rls_expect(
  (select count(*) from public.shops where slug = 'lumiere') = 0,
  'food user can see the salon shop'
);
select public._rls_expect((select count(*) from public.shop_members) = 1, 'food user should see only their membership');
select public._rls_expect(
  (select count(*) from public.menu_items where shop_id = '33333333-3333-4333-8333-333333333333') = 0,
  'food user can see seitai menu'
);

do $$
declare
  changed integer;
begin
  update public.faqs
  set answer = 'LEAKED'
  where shop_id = '22222222-2222-4222-8222-222222222222';
  get diagnostics changed = row_count;
  if changed <> 0 then
    raise exception 'RLS TEST FAILED: food user updated % salon faqs', changed;
  end if;
end $$;

do $$
begin
  insert into public.faqs (shop_id, question, answer)
  values ('22222222-2222-4222-8222-222222222222', '横取り', '見えてはいけない');
  raise exception 'RLS TEST FAILED: cross-shop faq insert was allowed';
exception
  when insufficient_privilege then
    null;
end $$;

insert into public.faqs (shop_id, question, answer)
values ('11111111-1111-4111-8111-111111111111', '隔離テスト', '自店だけ');

select public._rls_as(current_setting('test.salon_user'));
select public._rls_expect(
  (select count(*) from public.faqs where question = '隔離テスト') = 0,
  'salon user can see the food faq'
);
select public._rls_expect((select count(*) from public.faqs) = 7, 'salon user should see only their faqs');

select public._rls_as(current_setting('test.seitai_user'));
do $$
begin
  insert into public.faqs (shop_id, question, answer)
  values ('33333333-3333-4333-8333-333333333333', '効能', '必ず治る');
  raise exception 'RLS TEST FAILED: seitai efficacy claim was stored';
exception
  when check_violation then
    null;
end $$;

reset role;
select public._rls_expect(
  (select answer from public.faqs where id = '22222222-2222-4222-8222-000000000001') <> 'LEAKED',
  'salon faq was modified'
);
select public._rls_expect(
  (select count(*) from public.faqs where question = '隔離テスト') = 1,
  'own-shop insert was lost'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

select public._rls_expect((select count(*) from public.shops) = 3, 'anon should see 3 published shops');
select public._rls_expect((select count(*) from public.faqs) = 22, 'anon should see the seeded faqs plus the food test faq');

do $$
begin
  perform count(*) from public.handoff_requests;
  raise exception 'RLS TEST FAILED: anon selected handoff_requests';
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  perform count(*) from public.shop_members;
  raise exception 'RLS TEST FAILED: anon selected shop_members';
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  perform * from private.current_shop_ids();
  raise exception 'RLS TEST FAILED: anon called current_shop_ids';
exception
  when insufficient_privilege then
    null;
end $$;

do $$
begin
  insert into public.handoff_requests (shop_id, customer_name, contact, question)
  values ('11111111-1111-4111-8111-111111111111', '山田', '090-0000-0000', '駐車場を確認したい');
  raise exception 'RLS TEST FAILED: anon direct insert was allowed';
exception
  when insufficient_privilege then
    null;
end $$;

reset role;
insert into public.handoff_requests (shop_id, customer_name, contact, question)
values ('11111111-1111-4111-8111-111111111111', '山田', '090-0000-0000', '駐車場を確認したい');
insert into public.handoff_requests (shop_id, customer_name, contact, question)
values ('22222222-2222-4222-8222-222222222222', '佐藤', 'sato@example.com', 'カットの空きは？');

set local role authenticated;
select public._rls_as(current_setting('test.food_user'));
select public._rls_expect((select count(*) from public.handoff_requests) = 1, 'food user should see only their handoff');
select public._rls_expect(
  (select question from public.handoff_requests) = '駐車場を確認したい',
  'food user saw the wrong handoff'
);

select public._rls_as(current_setting('test.salon_user'));
select public._rls_expect((select count(*) from public.handoff_requests) = 1, 'salon user should see only their handoff');
select public._rls_expect(
  (select count(*) from public.handoff_requests where question = '駐車場を確認したい') = 0,
  'salon user saw the food handoff'
);

set local role authenticated;
select public._rls_as(current_setting('test.food_user'));
delete from public.handoff_requests where question = '駐車場を確認したい';
select public._rls_expect(
  (select count(*) from public.handoff_requests where question = '駐車場を確認したい') = 0,
  'food user should delete their own handoff'
);

reset role;
insert into public.handoff_requests (shop_id, customer_name, contact, question)
values ('11111111-1111-4111-8111-111111111111', '山田', '090-0000-0000', '二件目');
set local role authenticated;
select public._rls_as(current_setting('test.salon_user'));
do $$
declare
  removed integer;
begin
  delete from public.handoff_requests where question = '二件目';
  get diagnostics removed = row_count;
  if removed <> 0 then
    raise exception 'RLS TEST FAILED: salon user deleted a food handoff';
  end if;
end $$;

do $$
begin
  update public.shops set industry = 'salon' where id = '22222222-2222-4222-8222-222222222222';
  raise exception 'RLS TEST FAILED: shop updated industry';
exception
  when insufficient_privilege then
    null;
end $$;
do $$
begin
  update public.shops set slug = 'stolen' where id = '22222222-2222-4222-8222-222222222222';
  raise exception 'RLS TEST FAILED: shop updated slug';
exception
  when insufficient_privilege then
    null;
end $$;
do $$
begin
  update public.shops set published = false where id = '22222222-2222-4222-8222-222222222222';
  raise exception 'RLS TEST FAILED: shop updated published';
exception
  when insufficient_privilege then
    null;
end $$;
do $$
begin
  update public.shops set extra = jsonb_build_object('blob', repeat('a', 9000)) where id = '22222222-2222-4222-8222-222222222222';
  raise exception 'RLS TEST FAILED: oversized extra was stored';
exception
  when check_violation then
    null;
end $$;
do $$
begin
  update public.shops set map_url = 'http://example.com/map' where id = '22222222-2222-4222-8222-222222222222';
  raise exception 'RLS TEST FAILED: non-https url was stored';
exception
  when check_violation then
    null;
end $$;

reset role;
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);
update public.shops set plan = 'light' where slug = 'komorebi';
set local role authenticated;
select public._rls_as(current_setting('test.food_user'));
do $$
begin
  insert into public.faqs (shop_id, question, answer)
  values ('11111111-1111-4111-8111-111111111111', 'ライトでは書けない', 'だめ');
  raise exception 'RLS TEST FAILED: light plan faq write was allowed';
exception
  when insufficient_privilege then
    null;
end $$;
do $$
begin
  insert into public.menu_items (shop_id, category, name, price_text)
  values ('11111111-1111-4111-8111-111111111111', 'cafe', 'ライトでは書けない', '100円');
  raise exception 'RLS TEST FAILED: light plan menu write was allowed';
exception
  when insufficient_privilege then
    if sqlerrm not like '%plan%' then
      raise exception 'RLS TEST FAILED: expected plan rejection for menu, got %', sqlerrm;
    end if;
end $$;
update public.shops set name = 'こもれび（テスト）' where id = '11111111-1111-4111-8111-111111111111';
select public._rls_expect(
  (select name from public.shops where id = '11111111-1111-4111-8111-111111111111') = 'こもれび（テスト）',
  'light shop should still rename itself'
);
do $$
begin
  update public.shops
  set hours = '9:00〜10:00', access_text = 'テスト入口'
  where id = '11111111-1111-4111-8111-111111111111';
  raise exception 'RLS TEST FAILED: light plan changed hours and access';
exception
  when insufficient_privilege then
    if sqlerrm not like '%standard plan required%' then
      raise exception 'RLS TEST FAILED: expected standard plan required, got %', sqlerrm;
    end if;
end $$;

reset role;
set local role service_role;
do $$
begin
  perform public.accept_handoff(
    '11111111-1111-4111-8111-111111111111',
    '山田',
    '090-0000-0000',
    'ライト店への引き継ぎ',
    repeat('ab', 16)
  );
  raise exception 'RLS TEST FAILED: handoff allowed for a light plan shop';
exception
  when insufficient_privilege then
    null;
end $$;
reset role;
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);
update public.shops set plan = 'full' where slug = 'komorebi';
set local role service_role;
do $$
begin
  perform public.accept_handoff(
    '33333333-3333-4333-8333-333333333333',
    '形式',
    'not-an-email',
    '連絡先が不正',
    repeat('cd', 16)
  );
  raise exception 'RLS TEST FAILED: invalid contact was accepted';
exception
  when check_violation then
    if sqlerrm not like '%contact_invalid%' then
      raise exception 'RLS TEST FAILED: expected contact_invalid, got %', sqlerrm;
    end if;
end $$;

do $$
declare
  i integer;
  created_id uuid;
begin
  for i in 1..5 loop
    created_id := public.accept_handoff(
      '33333333-3333-4333-8333-333333333333',
      '連続',
      '090-1111-2222',
      'ip cap ' || i::text,
      repeat('ef', 16)
    );
    if created_id is null then
      raise exception 'RLS TEST FAILED: accept_handoff call % returned null', i;
    end if;
  end loop;
  begin
    perform public.accept_handoff(
      '33333333-3333-4333-8333-333333333333',
      '連続',
      '090-1111-2222',
      'ip cap 6',
      repeat('ef', 16)
    );
    raise exception 'RLS TEST FAILED: 6th accept_handoff was allowed';
  exception
    when check_violation then
      if sqlerrm not like '%rate_limited%' then
        raise exception 'RLS TEST FAILED: expected rate_limited, got %', sqlerrm;
      end if;
  end;
end $$;

reset role;
insert into auth.users (id, email, email_confirmed_at)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'unconfirmed.demo@example.com', null);
insert into public.shop_members (user_id, shop_id)
select users.id, '11111111-1111-4111-8111-111111111111'::uuid
from auth.users as users
where lower(users.email) = 'unconfirmed.demo@example.com'
  and users.email_confirmed_at is not null
on conflict (user_id) do update set shop_id = excluded.shop_id;
select public._rls_expect(
  (select count(*) from public.shop_members where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1') = 0,
  'unconfirmed user was linked'
);

reset role;
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);
update public.shops set published = false where slug = 'lumiere';

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select public._rls_expect((select count(*) from public.shops) = 2, 'anon should hide an unpublished shop');
select public._rls_expect(
  (select count(*) from public.faqs where shop_id = '22222222-2222-4222-8222-222222222222') = 0,
  'anon should hide faqs of an unpublished shop'
);

reset role;
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);
grant update (industry, slug, published, plan) on table public.shops to authenticated;
set local role authenticated;
select public._rls_as(current_setting('test.food_user'));
do $$
begin
  update public.shops set industry = 'salon' where id = '11111111-1111-4111-8111-111111111111';
  raise exception 'RLS TEST FAILED: industry change passed the role check';
exception
  when insufficient_privilege then
    if sqlerrm not like '%immutable shop column%' then
      raise exception 'RLS TEST FAILED: expected immutable shop column, got %', sqlerrm;
    end if;
end $$;

reset role;
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);
set local role service_role;
do $$
declare
  created_id uuid;
begin
  created_id := public.accept_handoff(
    '33333333-3333-4333-8333-333333333333',
    '=SUM(1)',
    '090-2222-3333',
    'formula',
    repeat('12', 16)
  );
  if created_id is null then
    raise exception 'RLS TEST FAILED: formula handoff returned null';
  end if;
end $$;
do $$
begin
  perform public.accept_handoff(
    '33333333-3333-4333-8333-333333333333',
    'ゼロ',
    '0000000000',
    'all same digits',
    repeat('13', 16)
  );
  raise exception 'RLS TEST FAILED: all-same phone was accepted';
exception
  when check_violation then
    if sqlerrm not like '%contact_invalid%' then
      raise exception 'RLS TEST FAILED: expected contact_invalid, got %', sqlerrm;
    end if;
end $$;
select public.accept_handoff(
  '33333333-3333-4333-8333-333333333333',
  '式',
  '090-3333-4444',
  '=HYPERLINK("https://example.invalid")',
  repeat('15', 16)
);
select public.accept_consult(
  '=cmd',
  '飲食店',
  '',
  '担当',
  'owner@example.com',
  '',
  'https://example.com/shop',
  'まだ決めていない',
  'まず話を聞きたい',
  '',
  '',
  false,
  '',
  false,
  repeat('14', 16)
);

reset role;
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);
select public._rls_expect(
  (select customer_name from public.handoff_requests where question = 'formula') = '''=SUM(1)',
  'formula prefix missing on handoff'
);
select public._rls_expect(
  (select question from public.handoff_requests where contact = '090-3333-4444') = '''=HYPERLINK("https://example.invalid")',
  'hyperlink formula was stored raw'
);
select public._rls_expect(
  (select shop_name from public.consult_requests) = '''=cmd',
  'formula prefix missing on consult'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.role', 'anon', true);
do $$
begin
  perform 1 from public.consult_requests;
  raise exception 'RLS TEST FAILED: anon read consult_requests';
exception
  when insufficient_privilege then
    null;
end $$;
do $$
begin
  insert into public.consult_requests (shop_name, industry, contact_name, email, site_url, plan_choice, application_kind)
  values ('店', '飲食店', '担当', 'a@example.com', 'https://example.com/shop', 'ライト', 'まず話を聞きたい');
  raise exception 'RLS TEST FAILED: anon inserted consult_requests';
exception
  when insufficient_privilege then
    null;
end $$;

set local role authenticated;
select public._rls_as(current_setting('test.food_user'));
do $$
begin
  perform 1 from public.consult_requests;
  raise exception 'RLS TEST FAILED: shop user read consult_requests';
exception
  when insufficient_privilege then
    null;
end $$;

reset role;
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);
revoke update on table public.shops from authenticated;
grant update (plan) on table public.shops to authenticated;
set local role authenticated;
select public._rls_as(current_setting('test.food_user'));
do $$
begin
  update public.shops set plan = 'light' where id = '11111111-1111-4111-8111-111111111111';
  raise exception 'RLS TEST FAILED: plan change passed the role check';
exception
  when insufficient_privilege then
    if sqlerrm not like '%immutable shop column%' then
      raise exception 'RLS TEST FAILED: expected immutable shop column, got %', sqlerrm;
    end if;
end $$;

reset role;
select set_config('request.jwt.claim.role', '', true);
select set_config('request.jwt.claims', '', true);
delete from public.handoff_requests where shop_id = '33333333-3333-4333-8333-333333333333';
set local role service_role;
do $$
declare
  i integer;
  created_id uuid;
begin
  for i in 1..200 loop
    created_id := public.accept_handoff(
      '33333333-3333-4333-8333-333333333333',
      '上限',
      '090-1111-2222',
      'shop cap ' || i::text,
      lpad(i::text, 32, 'a')
    );
    if created_id is null then
      raise exception 'RLS TEST FAILED: shop cap call % returned null', i;
    end if;
  end loop;
  if (select count(*) from public.handoff_requests where shop_id = '33333333-3333-4333-8333-333333333333') <> 200 then
    raise exception 'RLS TEST FAILED: expected 200 handoffs before the shop cap';
  end if;
  begin
    perform public.accept_handoff(
      '33333333-3333-4333-8333-333333333333',
      '上限',
      '090-1111-2222',
      'shop cap 201',
      lpad('201', 32, 'b')
    );
    raise exception 'RLS TEST FAILED: 201st handoff was allowed';
  exception
    when check_violation then
      if sqlerrm not like '%rate_limited%' then
        raise exception 'RLS TEST FAILED: expected rate_limited at 201, got %', sqlerrm;
      end if;
  end;
end $$;

reset role;
do $$
begin
  raise notice 'RLS isolation tests passed';
end $$;

rollback;
