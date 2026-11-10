import type { Catalog, PlanId, Shop } from '../types';
import { INDUSTRY_LABEL, PLAN_LABEL } from '../types';
import { loadPublicCatalog } from '../data/api';
import { createPublicClient } from '../lib/supabase';
import { el } from './dom';
import { chatSkeleton, mountChat } from './chat';
import { consultForm } from './consult-form';

const PLANS: { id: PlanId; price: string; monthly: string; audience: string; points: string[] }[] = [
  {
    id: 'light',
    price: '初期 20,000円',
    monthly: '月額 5,000円',
    audience: 'まずはよくある質問に自動で答えたいお店に',
    points: ['よくある質問にボタンと入力で自動回答', '答えられないときはお店の電話・メールをご案内'],
  },
  {
    id: 'standard',
    price: '初期 40,000円',
    monthly: '月額 10,000円',
    audience: '予約やメニュー案内まで任せたいお店向け',
    points: ['ライトの内容すべて', 'メニュー・営業時間・アクセスをボタンでご案内', 'お使いの予約ページへご案内', '質問と答えをお店で自由に編集'],
  },
  {
    id: 'full',
    price: '初期 80,000円',
    monthly: '月額 18,000円',
    audience: '答えられない質問も、スタッフへつなぎたいお店に',
    points: ['標準の内容すべて', '答えられない質問をスタッフへ引き継ぎ', '届いたお問い合わせを管理画面で一覧表示'],
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
      el('p', { class: 'audience' }, plan.id === 'standard'
        ? ['予約やメニュー案内まで', el('br'), '任せたいお店向け']
        : [plan.audience]),
      el('p', { class: 'price' }, [plan.price]),
      el('p', { class: 'price sub' }, [`${plan.monthly}（税別）`]),
      el('ul', null, plan.points.map((point) => el('li', null, [point]))),
      el('a', { class: 'button', href: `/demo/${plan.id}` }, ['デモを開く']),
    ]),
  );
  return el('main', { class: 'sheet' }, [
    siteHeader('/'),
    el('section', { class: 'hero' }, [
      el('p', { class: 'eyebrow' }, ['飲食店・美容室・整体院向け　ホームページ用チャット']),
      el('h1', null, ['よくある質問への対応は、チャットにおまかせ。']),
      el('p', { class: 'lede' }, [
        '営業時間・メニュー・予約方法など、毎日のように聞かれる質問に、24時間ボタンひとつでお答えします。決まった答えだけを返すので、間違った案内をする心配がありません。下のデモで、飲食店・美容室・整体院の3業種をお試しください。',
      ]),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['相談・申し込み']),
        el('a', { class: 'button ghost', href: '/demo/standard' }, ['デモを試す']),
      ]),
      el('p', { class: 'note' }, ['店名・住所・料金はすべて架空です。実在のお店とは関係ありません。']),
    ]),
    el('section', { class: 'plan-grid' }, cards),
    el('section', { class: 'panel' }, [
      el('h2', null, ['ホームページへの設置']),
      el('p', null, ['お使いのホームページに、コードを1行貼るだけで設置できます。']),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['導入について相談する']),
      ]),
    ]),
  ]);
}

export function consultView(supabaseUrl: string, anonKey: string): HTMLElement {
  return el('main', { class: 'sheet narrow' }, [
    siteHeader('/consult'),
    el('p', { class: 'eyebrow' }, ['相談・申し込み']),
    el('h1', null, ['相談・申し込み']),
    consultForm(supabaseUrl, anonKey),
    el('p', null, [el('a', { class: 'button ghost', href: '/demo/standard' }, ['デモを試す'])]),
  ]);
}

export function privacyView(): HTMLElement {
  return el('main', { class: 'sheet narrow' }, [
    siteHeader('/privacy'),
    el('p', { class: 'eyebrow' }, ['プライバシーポリシー']),
    el('h1', null, ['個人情報の取扱い']),
    el('p', null, ['事業者の氏名・住所：【運営者名】【住所】。この欄は未定です。']),
    el('h2', null, ['取得する情報']),
    el('p', null, ['相談・申し込みフォームに入力された店名、担当者名、メールアドレス、電話番号、URL、相談内容です。引き継ぎフォームでは、お名前、連絡先、質問内容を受け取ります。']),
    el('h2', null, ['利用目的']),
    el('p', null, ['導入のご相談への回答と、ご契約の準備のためだけに使います。案内メールは、希望した人にだけ送ります。自動返信メールは送りません。']),
    el('h2', null, ['委託先']),
    el('p', null, ['データベースは Supabase、確認用のウィジェットは Cloudflare Turnstile、このサイトの配信は Render に委託しています。法令に基づく場合を除き、同意なく第三者へ提供しません。']),
    el('h2', null, ['外国にある第三者への提供']),
    el('p', null, ['相談内容と引き継ぎは Supabase に保存します。保存先のリージョンは【Supabaseの保存リージョン】です。Cloudflare Turnstile と Render は、それぞれのネットワークで通信を扱います。']),
    el('h2', null, ['保管期間']),
    el('p', null, ['相談・申し込みは90日で消します。スタッフへの引き継ぎは7日で消します。IPをハッシュした回数の記録は1日で消します。']),
    el('h2', null, ['開示・訂正・削除の請求']),
    el('p', null, ['開示、訂正、利用停止、削除のご請求は【連絡先メール】へ送ってください。この欄は未定です。']),
    el('p', null, ['制定日：【日付】']),
  ]);
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
): void {
  if (preset) {
    document.body.classList.toggle('widget', widget);
    if (widget) {
      const frame = el('div', { class: 'widget-frame' });
      root.replaceChildren(frame);
      mountChat(frame, { plan, catalog: preset, supabaseUrl, anonKey });
      return;
    }
    root.replaceChildren(demoLayout(plan, preset, supabaseUrl, anonKey));
    return;
  }
  const client = createPublicClient(supabaseUrl, anonKey);
  const skeletonHost = el('div', { class: 'chat-host' });
  skeletonHost.append(chatSkeleton(plan));
  root.replaceChildren(
    widget
      ? skeletonHost
      : el('main', { class: 'sheet demo-page' }, [siteHeader(planPath(plan)), el('div', { class: 'demo-layout' }, [el('section', { class: 'storefront' }, [el('p', null, ['チャットを準備しています…'])]), skeletonHost])]),
  );
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

function demoLayout(plan: PlanId, catalog: Catalog, supabaseUrl: string, anonKey: string): HTMLElement {
  const heroTitle = el('h1', null, ['お店のホームページ（見本）']);
  const hours = el('p', { class: 'store-meta' }, ['チャットで業種を選ぶと、営業時間と住所がここに出ます。']);
  const heroText = el('p', null, ['チャットで業種を選ぶと、そのお店のスタッフになったつもりでご案内します。まずは気になる業種を選んでみてください。']);
  const chatHost = el('div', { class: 'chat-host' });
  const page = el('main', { class: 'sheet demo-page' }, [
    siteHeader(planPath(plan)),
    el('div', { class: 'demo-layout' }, [
      el('section', { class: 'storefront' }, [
        el('p', { class: 'eyebrow' }, [`${PLAN_LABEL[plan]}プランの見本`]),
        heroTitle,
        hours,
        heroText,
        el('ul', { class: 'store-points' }, [
          el('li', null, ['ボタンを押すだけで、営業時間・メニュー・予約方法をご案内します']),
          el('li', null, ['「駐車場ある？」のような話し言葉の質問にも、登録した答えでお返しします']),
          el('li', null, [
            plan === 'light'
              ? '答えが決まっていない質問には、お店の電話・メールをご案内します'
              : '答えが決まっていない質問には、無理に答えずお店へおつなぎします',
          ]),
        ]),
        el('h2', null, ['お店のホームページに置くとこう見えます']),
        el('p', null, [el('a', { href: `/widget/${plan}` }, ['チャットだけの表示を見る'])]),
        ...(plan === 'light' ? [] : [adminSample()]),
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
      const shop = catalog.shops.find((item) => item.industry === industry);
      page.querySelector('.storefront')?.classList.remove('food', 'salon', 'seitai');
      if (industry) page.querySelector('.storefront')?.classList.add(industry);
      heroTitle.textContent = shop?.name ?? 'お店のホームページ（見本）';
      hours.textContent = shop ? `${shop.hours}　定休日 ${shop.closedDays}　${shop.address}` : 'チャットで業種を選ぶと、営業時間と住所がここに出ます。';
      heroText.textContent = shop
        ? `${INDUSTRY_LABEL[industry!]}の見本です。料金も住所も架空です。`
        : 'チャットで業種を選ぶと、そのお店のスタッフになったつもりでご案内します。まずは気になる業種を選んでみてください。';
    },
  });
  return page;
}

function adminSample(): HTMLElement {
  return el('aside', { class: 'admin-sample' }, [
    el('h2', null, ['お店の管理画面（見本）']),
    el('p', { class: 'hint' }, ['ご契約のお店は、ログインして質問と答えを直せます。これは見本です。']),
    el('article', { class: 'faq-card' }, [
      el('h3', null, ['駐車場はありますか？']),
      el('p', null, ['お店の前に2台分あります。']),
      el('p', { class: 'hint' }, ['チャットに表示中']),
    ]),
  ]);
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
    note.textContent = 'これは見本ページです。予約は確定していません。実際の導入時は、ここにお店の予約ページ（ホットペッパーグルメなど）が開きます。';
  });
  return el('main', { class: 'sheet narrow' }, [
    siteHeader(''),
    el('p', { class: 'eyebrow' }, ['ネット予約の見本']),
    el('h1', null, [name]),
    el('p', null, ['このページはデモです。送信しても予約は保存されず、お店には届きません。']),
    el('p', null, ['実際の導入時は、ここにお店の予約ページ（ホットペッパーグルメなど）が開きます。']),
    shop ? el('p', null, [`電話：${shop.phone}`]) : el('p', null, ['お店のデータを読み込めませんでした。']),
    form,
    note,
    el('p', null, [el('a', { href: '/demo/standard' }, ['チャットのデモへ戻る'])]),
  ]);
}

function planPath(plan: PlanId): string {
  return `/demo/${plan}`;
}

function siteHeader(current: string): HTMLElement {
  const links: [string, string][] = [
    ['/demo/light', 'ライト'],
    ['/demo/standard', '標準'],
    ['/demo/full', '充実'],
    ['/admin', '管理'],
  ];
  return el('header', { class: 'site-header' }, [
    el('a', { class: 'brand', href: '/' }, ['店ボット']),
    el('nav', { class: 'nav' }, links.map(([href, label]) => {
      const attrs: Record<string, string> = { href };
      if (href === current) attrs['aria-current'] = 'page';
      return el('a', attrs, [label]);
    })),
    el('span', { class: 'header-note' }, ['架空のデモ']),
  ]);
}
