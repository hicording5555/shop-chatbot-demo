-- Data API は private を公開しない。上限の記録は public の関数経由にする。
-- 既に適用したファイルは書き換えない。

create or replace function public.record_cap_hit(p_kind text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.cap_hits (kind)
  select checked.kind
  from (
    select p_kind as kind
    where p_kind in ('consult_global', 'consult_ip', 'handoff_shop', 'handoff_ip')
    union all
    select ((p_kind || ' invalid cap kind')::integer)::text
    where p_kind is null
      or p_kind not in ('consult_global', 'consult_ip', 'handoff_shop', 'handoff_ip')
  ) as checked;
$$;

revoke all on function public.record_cap_hit(text) from public, anon, authenticated;
grant execute on function public.record_cap_hit(text) to service_role;

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
        delete from private.cap_hits where created_at < now() - interval '90 days';
      $cron$
    );
  else
    raise notice 'pg_cron が無効です。有効化したあと、このスケジュールを再実行してください。';
  end if;
end $$;
