import { demoFaqs, demoMenu, demoShops } from './demo-seed';

function sql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function textArray(values: string[]): string {
  if (values.length === 0) return `'{}'::text[]`;
  return `array[${values.map(sql).join(', ')}]::text[]`;
}

export function renderSeedSql(): string {
  const shopColumns = [
    'id',
    'slug',
    'industry',
    'name',
    'published',
    'phone',
    'email',
    'address',
    'hours',
    'closed_days',
    'access_text',
    'map_url',
    'parking',
    'reservation_url',
    'reservation_label',
    'handoff_business_days',
    'extra',
  ];
  const shopRows = demoShops
    .map((shop) => {
      const values = [
        `${sql(shop.id)}::uuid`,
        sql(shop.slug),
        sql(shop.industry),
        sql(shop.name),
        shop.published ? 'true' : 'false',
        sql(shop.phone),
        sql(shop.email),
        sql(shop.address),
        sql(shop.hours),
        sql(shop.closedDays),
        sql(shop.accessText),
        sql(shop.mapUrl),
        sql(shop.parking),
        sql(shop.reservationUrl),
        sql(shop.reservationLabel),
        String(shop.handoffBusinessDays),
        `${sql(JSON.stringify(shop.extra))}::jsonb`,
      ];
      return `  (${values.join(', ')})`;
    })
    .join(',\n');

  const menuRows = demoMenu
    .map(
      (item) =>
        `  (${sql(item.id)}::uuid, ${sql(item.shopId)}::uuid, ${sql(item.category)}, ${sql(item.name)}, ${sql(item.priceText)}, ${sql(item.detail)}, ${item.sortOrder})`,
    )
    .join(',\n');

  const faqRows = demoFaqs
    .map(
      (faq) =>
        `  (${sql(faq.id)}::uuid, ${sql(faq.shopId)}::uuid, ${sql(faq.question)}, ${sql(faq.answer)}, ${textArray(faq.keywords)}, ${faq.published ? 'true' : 'false'}, ${faq.sortOrder})`,
    )
    .join(',\n');

  const ids = demoShops.map((shop) => `${sql(shop.id)}::uuid`).join(', ');
  return `-- 架空3店舗のデモデータ。src/data/demo-seed.ts から npm run seed:sql で再生成する。
-- 再実行すると3店舗を削除して作り直す。FAQ・メニュー・引き継ぎ・shop_members も消える。
begin;

delete from public.shops
where slug in ('komorebi', 'lumiere', 'yasuragi')
   or id in (${ids});

insert into public.shops (${shopColumns.join(', ')})
values
${shopRows};

insert into public.menu_items (id, shop_id, category, name, price_text, detail, sort_order)
values
${menuRows};

insert into public.faqs (id, shop_id, question, answer, keywords, published, sort_order)
values
${faqRows};

commit;
`;
}
