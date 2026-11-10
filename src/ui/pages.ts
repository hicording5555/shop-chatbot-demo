import type { Catalog, Industry, PlanId } from '../types';
import { INDUSTRY_LABEL, PLAN_LABEL } from '../types';
import { loadPublicCatalog } from '../data/api';
import { createPublicClient } from '../lib/supabase';
import { el } from './dom';
import { mountChat } from './chat';

const PLANS: { id: PlanId; price: string; monthly: string; points: string[] }[] = [
  {
    id: 'light',
    price: '初期 20,000円',
    monthly: '月額 5,000円',
    points: ['FAQボタンとキーワード検索', '答えられないときは連絡先', '予約は確定しない'],
  },
  {
    id: 'standard',
    price: '初期 40,000円',
    monthly: '月額 10,000円',
    points: ['ライトの案内', 'メニュー・予約・営業時間', '予約ページへ誘導', '自店のFAQを編集'],
  },
  {
    id: 'full',
    price: '初期 80,000円',
    monthly: '月額 18,000円',
    points: ['標準の案内', '答えられない質問を引き継ぐ', '管理画面で受信を確認', 'メールは送らない'],
  },
];

export function missingEnvView(missing: string[], serviceRole: boolean): HTMLElement {
  const items = missing.map((name) => el('li', null, [name]));
  const notes = [
    'この画面は Supabase の公開URLと anon キーがないと動きません。',
    '.env.example を .env にコピーし、VITE_SUPABASE_ANON_KEY を入れてから開発サーバを起動し直してください。',
  ];
  if (serviceRole) {
    notes.unshift('service_role キーはブラウザに置けません。anon キーを入れてください。');
  }
  return el('main', { class: 'sheet narrow' }, [
    el('p', { class: 'eyebrow' }, ['設定が必要です']),
    el('h1', null, ['環境変数が足りません']),
    ...notes.map((note) => el('p', null, [note])),
    items.length ? el('ul', { class: 'plain' }, items) : el('p', null, ['キーの種類を確認してください。']),
  ]);
}

export function landingView(): HTMLElement {
  const cards = PLANS.map((plan) =>
    el('article', { class: 'plan-card' }, [
      el('h2', null, [PLAN_LABEL[plan.id]]),
      el('p', { class: 'price' }, [plan.price]),
      el('p', { class: 'price sub' }, [`${plan.monthly}（税別）`]),
      el('ul', null, plan.points.map((point) => el('li', null, [point]))),
      el('a', { class: 'button', href: `/demo/${plan.id}` }, ['デモを開く']),
    ]),
  );
  return el('main', { class: 'sheet' }, [
    siteHeader(false),
    el('section', { class: 'hero' }, [
      el('p', { class: 'eyebrow' }, ['小規模店向け・ボタンで案内するチャット']),
      el('h1', null, ['店のよくある質問に、その場で答える']),
      el('p', { class: 'lede' }, [
        'AIは使いません。選択肢とFAQのキーワード検索だけです。飲食・美容室・整体の架空店舗で、ライト・標準・充実の3つを試せます。',
      ]),
      el('p', { class: 'note' }, ['店名・住所・料金はすべて架空です。実在のお店とは関係ありません。']),
    ]),
    el('section', { class: 'plan-grid' }, cards),
    el('section', { class: 'panel' }, [
      el('h2', null, ['ホームページへの埋め込み']),
      el('p', null, ['ウィジェット用のページを iframe で置くか、埋め込みスクリプトを読み込みます。']),
      el('pre', null, [
        '<iframe src="https://YOUR_HOST/widget/standard" title="お店のチャット" width="380" height="640" style="border:0"></iframe>',
      ]),
      el('pre', null, ['<script src="https://YOUR_HOST/embed.js" data-plan="standard" defer></script>']),
      el('p', null, ['data-plan は light / standard / full です。スクリプトは画面右下に iframe を出します。']),
    ]),
    el('section', { class: 'panel' }, [
      el('h2', null, ['お店の管理画面']),
      el('p', null, ['標準と充実では、ログインしたお店が自分のFAQだけを編集できます。充実では引き継ぎの受信一覧も見えます。']),
      el('a', { class: 'button ghost', href: '/admin' }, ['管理画面へ']),
    ]),
  ]);
}

export function notFoundView(): HTMLElement {
  return el('main', { class: 'sheet narrow' }, [
    el('h1', null, ['ページが見つかりません']),
    el('a', { class: 'button', href: '/' }, ['トップへ戻る']),
  ]);
}

export function mountDemo(
  root: HTMLElement,
  plan: PlanId,
  supabaseUrl: string,
  anonKey: string,
  widget: boolean,
): void {
  const client = createPublicClient(supabaseUrl, anonKey);
  root.replaceChildren(el('main', { class: 'sheet' }, [el('p', null, ['読み込み中です…'])]));
  loadPublicCatalog(client)
    .then((catalog) => {
      if (catalog.shops.length === 0) {
        root.replaceChildren(
          el('main', { class: 'sheet narrow' }, [
            el('h1', null, ['お店のデータがありません']),
            el('p', null, ['Supabase で migration と seed.sql を実行してください。']),
          ]),
        );
        return;
      }
      if (widget) {
        document.body.classList.add('widget');
        const frame = el('div', { class: 'widget-frame' });
        root.replaceChildren(frame);
        mountChat(frame, { plan, catalog, supabaseUrl, anonKey });
        return;
      }
      document.body.classList.remove('widget');
      root.replaceChildren(demoLayout(plan, catalog, supabaseUrl, anonKey));
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : '読み込めませんでした';
      root.replaceChildren(
        el('main', { class: 'sheet narrow' }, [
          el('h1', null, ['データを読み込めませんでした']),
          el('p', null, [message]),
          el('p', null, ['URL・anon キー・RLSの公開読み取りを確認してください。']),
        ]),
      );
    });
}

function demoLayout(plan: PlanId, catalog: Catalog, supabaseUrl: string, anonKey: string): HTMLElement {
  const heroTitle = el('h1', null, ['架空のお店のホームページ']);
  const heroText = el('p', null, ['右のチャットで業種を選ぶと、そのお店として案内します。予約はこのページでは確定しません。']);
  const chatHost = el('div', { class: 'chat-host' });
  const page = el('main', { class: 'sheet demo-page' }, [
    siteHeader(true),
    el('div', { class: 'demo-layout' }, [
      el('section', { class: 'storefront' }, [
        el('p', { class: 'eyebrow' }, [`${PLAN_LABEL[plan]}プランのデモ`]),
        heroTitle,
        heroText,
        el('ul', { class: 'store-points' }, [
          el('li', null, ['ランチも、カットも、整体の予約も、ボットの中では確定しません。']),
          el('li', null, ['自由入力はFAQのキーワードで探します。誤字や話し言葉もある程度吸収します。']),
          el('li', null, ['整体の文面は、治る・改善する・効く、といった断定をしません。']),
        ]),
        el('h2', null, ['このプランでできること']),
        el('ul', null, PLANS.find((item) => item.id === plan)!.points.map((point) => el('li', null, [point]))),
        el('h2', null, ['埋め込み']),
        el('p', null, ['同じチャットを iframe でも開けます。']),
        el('p', null, [
          el('a', { href: `/widget/${plan}`, target: '_blank', rel: 'noreferrer' }, ['ウィジェットだけを開く']),
        ]),
      ]),
      chatHost,
    ]),
  ]);
  mountChat(chatHost, {
    plan,
    catalog,
    supabaseUrl,
    anonKey,
    onIndustry(industry) {
      heroTitle.textContent = industry ? shopTitle(catalog, industry) : '架空のお店のホームページ';
      heroText.textContent = industry
        ? `${INDUSTRY_LABEL[industry]}として案内しています。内容はデモ用の作り話です。`
        : '右のチャットで業種を選ぶと、そのお店として案内します。予約はこのページでは確定しません。';
    },
  });
  return page;
}

function shopTitle(catalog: Catalog, industry: Industry): string {
  return catalog.shops.find((shop) => shop.industry === industry)?.name ?? '架空のお店';
}

function siteHeader(compact: boolean): HTMLElement {
  return el('header', { class: 'site-header' }, [
    el('a', { class: 'brand', href: '/' }, ['店ボット']),
    el('nav', { class: 'nav' }, [
      el('a', { href: '/demo/light' }, ['ライト']),
      el('a', { href: '/demo/standard' }, ['標準']),
      el('a', { href: '/demo/full' }, ['充実']),
      el('a', { href: '/admin' }, ['管理']),
    ]),
    compact ? el('span', { class: 'header-note' }, ['架空のデモ']) : el('span', null, ['']),
  ]);
}
