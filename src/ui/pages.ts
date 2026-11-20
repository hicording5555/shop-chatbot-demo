import type { Catalog, PlanId, Shop } from '../types';
import { INDUSTRY_LABEL, PLAN_LABEL } from '../types';
import { loadPublicCatalog } from '../data/api';
import { templateBySlug } from '../data/templates';
import { planChoiceFromSearch } from '../content/service';
import { createPublicClient } from '../lib/supabase';
import { el } from './dom';
import { chatSkeleton, mountChat } from './chat';
import { consultForm } from './consult-form';
import { pageShell } from './site-chrome';

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

export function consultView(supabaseUrl: string, anonKey: string, search = ''): HTMLElement {
  return pageShell('/consult', [
    el('h1', null, ['相談・申し込み']),
    consultForm(supabaseUrl, anonKey, planChoiceFromSearch(search)),
    el('p', null, [el('a', { class: 'button ghost', href: '/demo/standard' }, ['デモを試す'])]),
  ], true);
}

export function privacyView(): HTMLElement {
  return pageShell('/privacy', [
    el('h1', null, ['個人情報の取り扱い']),
    el('p', null, ['事業者の氏名・住所：【未定】。']),
    el('h2', null, ['取得する情報']),
    el('p', null, ['相談・申し込みフォームに入力された店名、担当者名、メールアドレス、電話番号、URL、相談内容です。引き継ぎフォームでは、お名前、連絡先、質問内容を受け取ります。IPアドレスとブラウザ情報（User-Agent等）も受け取ります。これらは Supabase のアクセスログに記録され、ボットの確認のために Cloudflare Turnstile へ送られます。']),
    el('h2', null, ['利用目的']),
    el('p', null, ['導入のご相談への回答と、ご契約の準備のためだけに使います。案内メールは、希望した人にだけ送ります。いまは自動返信メールは送りません。内容を確認のうえ、通常【〇営業日】以内にメールで返信します。']),
    el('h2', null, ['委託先']),
    el('p', null, ['データベースは Supabase、確認用のウィジェットは Cloudflare Turnstile、このサイトの配信は Render に委託しています。法令に基づく場合を除き、同意なく第三者へ提供しません。']),
    el('h2', null, ['国外での取り扱い']),
    el('p', null, ['相談内容と引き継ぎは、Supabase の日本（東京リージョン、ap-northeast-1）に保存します。Supabase は米国の会社です。送信を受け取る Edge Functions は米国東部（us-east-1）で動きます。Cloudflare Turnstile と Render は、日本の外で通信を扱うことがあります。']),
    el('h2', null, ['保管期間']),
    el('p', null, ['相談・申し込みは約90日で消します。スタッフへの引き継ぎは約7日で消します。IPをハッシュした回数の記録は最長で約2日で消します。']),
    el('h2', null, ['開示・訂正・削除の請求']),
    el('p', null, ['開示、訂正、利用停止、削除のご請求は【未定】の連絡先へ送ってください。']),
    el('p', null, ['制定日：【未定】。改定日：【未定】。']),
  ], true);
}

export function notFoundView(): HTMLElement {
  return el('main', { class: 'sheet narrow' }, [
    el('h1', null, ['お探しのページは見つかりませんでした。']),
    el('a', { class: 'button', href: '/' }, ['デモの一覧へ']),
  ]);
}

export function mountDemo(
  root: HTMLElement,
  plan: PlanId,
  supabaseUrl: string,
  anonKey: string,
  widget: boolean,
  preset?: Catalog,
  shopSlug?: string,
): void {
  if (preset) {
    document.body.classList.toggle('widget', widget);
    if (widget) {
      const frame = el('div', { class: 'widget-frame' });
      root.replaceChildren(frame);
      const shop = widgetShop(preset, shopSlug);
      if (!shop) {
        root.replaceChildren(missingShop());
        return;
      }
      mountChat(frame, { plan, catalog: preset, supabaseUrl, anonKey, shop });
      return;
    }
    root.replaceChildren(demoLayout(plan, preset, supabaseUrl, anonKey, shopSlug));
    return;
  }
  const client = createPublicClient(supabaseUrl, anonKey);
  const skeletonHost = el('div', { class: 'chat-host' });
  skeletonHost.append(chatSkeleton(plan));
  root.replaceChildren(
    widget
      ? skeletonHost
      : pageShell(planPath(plan), [el('div', { class: 'wrap demo-wrap' }, [el('p', { class: 'note' }, ['このページの店名・住所・料金は架空です。実在のお店とは関係ありません。']), el('div', { class: 'demo-layout' }, [el('section', { class: 'storefront' }, [el('p', null, ['チャットを準備しています…'])]), skeletonHost])])]),
  );
  loadPublicCatalog(client)
    .then((catalog) => {
      if (catalog.shops.length === 0) {
        root.replaceChildren(missingShop('Supabase で migration と seed.sql を実行してください。'));
        return;
      }
      if (widget) {
        document.body.classList.add('widget');
        const frame = el('div', { class: 'widget-frame' });
        root.replaceChildren(frame);
        const shop = widgetShop(catalog, shopSlug);
        if (!shop) {
          root.replaceChildren(missingShop());
          return;
        }
        mountChat(frame, { plan, catalog, supabaseUrl, anonKey, shop });
        return;
      }
      document.body.classList.remove('widget');
      root.replaceChildren(demoLayout(plan, catalog, supabaseUrl, anonKey));
    })
    .catch(() => {
      root.replaceChildren(
        el('main', { class: 'sheet narrow' }, [
          el('h1', null, ['ただいま表示できません']),
          el('p', null, ['時間をおいて再読み込みしてください。']),
          el('p', { class: 'hint' }, ['表示できない状態が続くときは、時間をおいて再度開いてください。']),
        ]),
      );
    });
}

function missingShop(note?: string): HTMLElement {
  document.body.classList.remove('widget');
  return el('main', { class: 'sheet narrow' }, [
    el('h1', null, ['お店のデータがありません']),
    ...(note ? [el('p', null, [note])] : []),
    el('a', { class: 'button', href: '/' }, ['デモのトップへ']),
  ]);
}

function widgetShop(catalog: Catalog, slug?: string): Shop | undefined {
  const published = catalog.shops.filter((shop) => shop.published);
  if (slug) return published.find((shop) => shop.slug === slug);
  return [...published].sort((a, b) => a.slug.localeCompare(b.slug))[0];
}

function demoLayout(plan: PlanId, catalog: Catalog, supabaseUrl: string, anonKey: string, shopSlug?: string): HTMLElement {
  const locked = shopSlug ? catalog.shops.find((item) => item.slug === shopSlug) : undefined;
  const heroTitle = el('h1', null, [locked?.name ?? 'お店のホームページ（見本）']);
  const hours = el('p', { class: 'store-meta' }, [
    locked
      ? `${locked.hours}　定休日 ${locked.closedDays}　${locked.address}`
      : 'チャットで業種を選ぶと、営業時間と住所がここに出ます。',
  ]);
  const heroText = el('p', null, [
    locked
      ? `${INDUSTRY_LABEL[locked.industry]}の見本です。店名・住所・料金は架空です。実在のお店とは関係ありません。`
      : '店名・住所・料金は架空です。実在のお店とは関係ありません。チャットで業種を選ぶと、そのお店の案内に切り替わります。',
  ]);
  const eyebrow = el('p', { class: 'eyebrow' }, [`${PLAN_LABEL[plan]}プランの見本`]);
  const chatHost = el('div', { class: 'chat-host' });
  const admin = adminSample(locked);
  admin.hidden = plan === 'light';
  const planIds: PlanId[] = ['light', 'standard', 'full'];
  const planTabs = el('div', { class: 'tablist', role: 'tablist', 'aria-label': 'プラン' });
  if (locked) {
    for (const id of planIds) {
      const button = el('button', {
        type: 'button',
        class: 'tab',
        role: 'tab',
        'aria-selected': id === plan ? 'true' : 'false',
      }, [PLAN_LABEL[id]]) as HTMLButtonElement;
      button.addEventListener('click', () => {
        for (const tab of Array.from(planTabs.querySelectorAll('button'))) tab.setAttribute('aria-selected', 'false');
        button.setAttribute('aria-selected', 'true');
        eyebrow.textContent = `${PLAN_LABEL[id]}プランの見本`;
        admin.hidden = id === 'light';
        mountChat(chatHost, { plan: id, catalog, supabaseUrl, anonKey, shop: locked });
      });
      planTabs.append(button);
    }
  } else {
    planTabs.hidden = true;
  }
  const storefront = el('section', { class: locked ? `storefront ${locked.industry}` : 'storefront' }, [
    eyebrow,
    heroTitle,
    hours,
    heroText,
    ...(locked?.extra.area ? [el('p', null, [`対応エリア：${locked.extra.area}`])] : []),
    planTabs,
    el('p', null, [el('a', { href: locked ? `/widget/${plan}/${locked.slug}` : `/widget/${plan}` }, ['チャットだけの表示を見る'])]),
    admin,
  ]);
  if (locked?.extra.brandColor && /^#[0-9a-fA-F]{6}$/.test(locked.extra.brandColor)) {
    storefront.style.borderTop = `4px solid ${locked.extra.brandColor}`;
  }
  const page = pageShell(locked ? `/demo/${locked.industry}` : planPath(plan), [
    el('div', { class: 'wrap demo-wrap' }, [
      el('p', { class: 'note' }, ['このページの店名・住所・料金は架空です。実在のお店とは関係ありません。']),
      el('div', { class: 'demo-layout' }, [
        storefront,
        chatHost,
      ]),
    ]),
  ]);
  mountChat(chatHost, {
    plan,
    catalog,
    supabaseUrl,
    anonKey,
    shop: locked,
    onIndustry(industry) {
      if (locked) return;
      const shop = catalog.shops.find((item) => item.industry === industry);
      page.querySelector('.storefront')?.classList.remove('food', 'salon', 'seitai', 'painting', 'juku');
      if (industry) page.querySelector('.storefront')?.classList.add(industry);
      heroTitle.textContent = shop?.name ?? 'お店のホームページ（見本）';
      hours.textContent = shop ? `${shop.hours}　定休日 ${shop.closedDays}　${shop.address}` : 'チャットで業種を選ぶと、営業時間と住所がここに出ます。';
      heroText.textContent = shop
        ? `${INDUSTRY_LABEL[industry!]}の見本です。店名・住所・料金は架空です。実在のお店とは関係ありません。`
        : '店名・住所・料金は架空です。実在のお店とは関係ありません。チャットで業種を選ぶと、そのお店の案内に切り替わります。';
    },
  });
  return page;
}

function adminSample(shop?: Shop): HTMLElement {
  const template = shop ? templateBySlug(shop.slug) : undefined;
  const question = template?.id === 'juku' ? '体験は有料ですか' : template?.id === 'seitai' ? '保険は使えますか' : '現地調査は無料ですか';
  const answer = template?.id === 'juku'
    ? '体験は無料です。予約ページから申し込めます。'
    : template?.id === 'seitai'
      ? '整体は保険の対象外で、全額自費になります。'
      : '無料です。調査のあと、金額は見積書でお出しします。';
  return el('aside', { class: 'admin-sample' }, [
    el('h2', null, ['管理画面の見本']),
    el('p', { class: 'hint' }, ['標準以上では、お店が質問と答えを直せます。これは見本です。']),
    el('article', { class: 'faq-card' }, [
      el('h3', null, [question]),
      el('p', null, [answer]),
      el('p', { class: 'hint' }, ['チャットに表示中']),
    ]),
  ]);
}

export function staticReserveView(shop: Shop): HTMLElement {
  return reserveView(shop);
}

export function mountReserve(root: HTMLElement, slug: string, supabaseUrl: string, anonKey: string): void {
  const client = createPublicClient(supabaseUrl, anonKey);
  root.replaceChildren(el('main', { class: 'sheet narrow' }, [el('p', null, ['チャットを準備しています…'])]));
  loadPublicCatalog(client)
    .then((catalog) => {
      const shop = catalog.shops.find((item) => item.slug === slug);
      root.replaceChildren(reserveView(shop));
    })
    .catch(() => {
      root.replaceChildren(reserveView(undefined));
    });
}

function reserveView(shop: Shop | undefined): HTMLElement {
  const name = shop?.name ?? '架空のお店';
  const note = el('p', { class: 'note', role: 'status' });
  note.hidden = true;
  const form = el('form', { class: 'stack' }, [
    el('label', { class: 'field' }, ['ご希望の日時', el('input', { type: 'text', placeholder: '例：明日 15:00' })]),
    el('label', { class: 'field' }, ['人数', el('input', { type: 'text', placeholder: '例：2名' })]),
    el('button', { class: 'button', type: 'submit' }, ['この内容で仮の確認をする']),
  ]) as HTMLFormElement;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    note.hidden = false;
    note.textContent = 'これは見本ページです。予約は確定していません。実際の導入時は、ここにお店の予約ページが開きます。';
  });
  return el('main', { id: 'main', class: 'sheet narrow reserve-page', tabindex: '-1' }, [
    el('p', { class: 'eyebrow' }, ['デモ']),
    el('h1', null, [name]),
    el('p', null, ['このページはデモです。送信しても予約は保存されず、お店には届きません。']),
    el('p', null, ['実際の導入時は、ここにお店の予約ページが開きます。']),
    shop ? el('p', null, [`電話：${shop.phone}`]) : el('p', null, ['お店のデータを読み込めませんでした。']),
    form,
    note,
    el('p', null, [el('a', { href: '/demo/standard' }, ['チャットのデモへ戻る'])]),
  ]);
}

function planPath(plan: PlanId): string {
  return `/demo/${plan}`;
}
