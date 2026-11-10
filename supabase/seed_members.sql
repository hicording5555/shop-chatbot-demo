-- 認証ユーザーと架空店舗の紐づけ。
-- 先に Dashboard → Authentication → Users で、メール確認を切ったデモユーザーを3人作る。
--
--   komorebi.demo@example.com  カフェ・こもれび
--   lumiere.demo@example.com   ヘアサロン・ルミエール
--   yasuragi.demo@example.com  やすらぎ整体院
--
-- プレースホルダ UUID（自分で auth.users にこの id を入れたとき用）:
--   aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1 → 11111111-1111-4111-8111-111111111111（komorebi）
--   aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2 → 22222222-2222-4222-8222-222222222222（lumiere）
--   aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3 → 33333333-3333-4333-8333-333333333333（yasuragi）
--
-- その場合は下の insert の代わりに、例えば次を使う:
-- insert into public.shop_members (user_id, shop_id) values
--   ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111'),
--   ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222'),
--   ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '33333333-3333-4333-8333-333333333333')
-- on conflict (user_id) do update set shop_id = excluded.shop_id;

do $$
declare
  missing text;
begin
  select string_agg(wanted.email, ', ')
  into missing
  from (
    values
      ('komorebi.demo@example.com'),
      ('lumiere.demo@example.com'),
      ('yasuragi.demo@example.com')
  ) as wanted(email)
  where not exists (
    select 1
    from auth.users as users
    where lower(users.email) = wanted.email
  );

  if missing is not null then
    raise exception '認証ユーザーが見つかりません: % 。Authentication でこのメールのユーザーを作ってから再実行してください。', missing;
  end if;
end $$;

delete from public.shop_members
where shop_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333'
);

insert into public.shop_members (user_id, shop_id)
select users.id, wanted.shop_id
from (
  values
    ('komorebi.demo@example.com', '11111111-1111-4111-8111-111111111111'::uuid),
    ('lumiere.demo@example.com', '22222222-2222-4222-8222-222222222222'::uuid),
    ('yasuragi.demo@example.com', '33333333-3333-4333-8333-333333333333'::uuid)
) as wanted(email, shop_id)
join auth.users as users on lower(users.email) = wanted.email
on conflict (user_id) do update set shop_id = excluded.shop_id;
