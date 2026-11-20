import {
  CONTRACT_NOTE,
  DELIVERY_DAYS,
  DEMO_PLAN_ID,
  FAQ_ITEMS,
  FUTURE_CHANGES,
  INITIAL_FEE_NOTE,
  LEGAL_ITEMS,
  PRICE_CHIPS,
  PRICE_FOOTNOTE,
  REPLY_WINDOW,
  SERVICE_PLANS,
  TERMS_HEADINGS,
  UNDECIDED,
  priceListText,
  yen,
  type ServicePlan,
} from '../content/service';
import { el } from './dom';
import { landingPage } from './landing';
import { pageShell } from './site-chrome';

export function landingView(): HTMLElement {
  return landingPage();
}

export function plansView(): HTMLElement {
  return pageShell('/plans', [
    el('div', { class: 'wrap page-intro' }, [
      el('h1', null, ['プランと料金']),
      el('p', null, ['税込を主に、税別を併記しています。']),
    ]),
    plansSection(false),
    el('div', { class: 'wrap' }, [
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['相談・申し込み']),
        el('a', { class: 'button ghost', href: '/flow' }, ['導入の流れ']),
        el('a', { class: 'button ghost', href: '/#demo' }, ['デモを試す']),
      ]),
    ]),
  ]);
}

export function flowView(): HTMLElement {
  return pageShell('/flow', [
    el('div', { class: 'wrap page-intro narrow-copy' }, [
      el('h1', null, ['導入の流れ']),
      el('h2', null, ['いまの手順']),
      el('p', null, ['次の3つが、いまのサイトでできることです。']),
      el('ol', { class: 'steps' }, [
        el('li', null, ['デモやよくある質問で、動きを見る。店の名前や料金は架空です。']),
        el('li', null, ['相談・申し込みフォームを送る。この送信では決済しません。自動返信メールは送りません。']),
        el('li', null, [`内容を確認のうえ、${REPLY_WINDOW}にメールで返信します。訪問やビデオ通話はありません。`]),
      ]),
      el('h2', null, ['今後の予定（いまは未実装です）']),
      el('p', null, ['ここから先は、まだこのサイトにはありません。']),
      el('ol', { class: 'steps' }, [
        el('li', null, ['フォーム送信後の自動返信（料金・規約）。']),
        el('li', null, ['利用規約に同意のうえ、最終確認画面から Stripe で初期費用と月額を支払う。']),
        el('li', null, [`支払い確認後、設置案内をメールまたは共有ページで渡す。訪問しての設定はしません。納期は${DELIVERY_DAYS}日。`]),
        el('li', null, [FUTURE_CHANGES]),
      ]),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['相談・申し込み']),
      ]),
    ]),
  ]);
}

export function faqView(): HTMLElement {
  return pageShell('/faq', [
    el('div', { class: 'wrap page-intro narrow-copy' }, [
      el('h1', null, ['よくある質問']),
      el('p', null, ['よくある質問は、まずこのページのデモ（架空の店です）でもお試しいただけます。一覧は以下のとおりです。']),
      el('p', null, [el('a', { href: '/#demo' }, ['トップのデモを開く'])]),
      el('div', { class: 'faq-list' }, FAQ_ITEMS.map((item) => el('article', { class: 'faq-item' }, [
        el('h2', null, [item.question]),
        el('p', null, faqAnswer(item.question, item.answer)),
      ]))),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['相談・申し込み']),
      ]),
    ]),
  ]);
}

export function legalView(): HTMLElement {
  return pageShell('/legal', [
    el('div', { class: 'wrap page-intro narrow-copy' }, [
      el('h1', null, ['特定商取引法に基づく表記']),
      el('p', null, ['通信販売の表示として、次の項目を置きます。空欄は準備中です。']),
      el('dl', { class: 'blank-list' }, LEGAL_ITEMS.flatMap((item) => [
        el('dt', null, [item.label]),
        el('dd', null, [item.label === '役務の対価' ? priceListText() : item.value]),
      ])),
    ]),
  ], true);
}

export function termsView(): HTMLElement {
  return pageShell('/terms', [
    el('div', { class: 'wrap page-intro narrow-copy' }, [
      el('h1', null, ['利用規約']),
      el('p', null, ['決まっていることだけを書き、残りは【未定】です。']),
      ...TERMS_HEADINGS.map((heading) => el('section', null, [
        el('h2', null, [heading]),
        el('p', null, [termsBody(heading)]),
      ])),
    ]),
  ], true);
}

function plansSection(onHome: boolean): HTMLElement {
  return el('section', { class: 'block', id: 'plans' }, [
    el('div', { class: 'wrap' }, [
      ...(onHome ? [priceHero()] : []),
      el('div', { class: 'plan-grid' }, SERVICE_PLANS.map((plan) => planCard(plan))),
      el('div', { class: 'compare-scroll' }, [compareTable()]),
      el('p', { class: 'price-footnote' }, [PRICE_FOOTNOTE]),
      el('p', { class: 'price-footnote' }, [
        '詳細は',
        el('a', { href: '/terms' }, ['利用規約']),
        'と',
        el('a', { href: '/legal' }, ['特定商取引法に基づく表記']),
        'です。',
      ]),
      ...(onHome
        ? [el('div', { class: 'cta-row' }, [el('a', { class: 'button ghost', href: '/plans' }, ['プランの詳細'])])]
        : []),
    ]),
  ]);
}

function priceHero(): HTMLElement {
  const light = SERVICE_PLANS[0];
  const digits = String(light?.monthlyTaxIn ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return el('div', { class: 'price-hero-block' }, [
    el('p', { class: 'eyebrow' }, ['料金']),
    el('h2', { class: 'price-hero' }, [
      '初期費用 ',
      el('span', { class: 'num' }, ['0']),
      '円。月額 ',
      el('span', { class: 'num' }, [digits]),
      '円（税込）から',
    ]),
    el('ul', { class: 'fact-chips' }, PRICE_CHIPS.map((chip) => el('li', null, [chip]))),
  ]);
}

function planCard(plan: ServicePlan): HTMLElement {
  const featured = plan.id === DEMO_PLAN_ID;
  return el('article', { class: featured ? 'plan-card is-recommended' : 'plan-card' }, [
    ...(featured ? [el('p', { class: 'recommend-badge' }, ['おすすめ'])] : []),
    el('h3', null, [plan.name]),
    el('p', { class: 'audience' }, [plan.audience]),
    el('p', { class: 'price' }, [`月額 ${yen(plan.monthlyTaxIn)}（税込）`]),
    el('p', { class: 'price-note' }, [`税別 ${yen(plan.monthlyTaxEx)}`]),
    el('p', { class: 'price' }, ['12か月の合計 ', el('br', null), `${yen(plan.termTotalTaxIn)}（税込）`]),
    el('ul', null, plan.features.map((feature) => el('li', null, [feature]))),
    el('a', { class: 'button', href: `/consult?plan=${plan.id}` }, ['このプランで相談する']),
  ]);
}

function compareTable(): HTMLElement {
  const head = el('tr', null, [
    el('th', { scope: 'col' }, ['']),
    ...SERVICE_PLANS.map((plan) => el('th', { scope: 'col' }, [plan.name])),
  ]);
  const rows: [string, (plan: ServicePlan) => string][] = [
    ['対象', (plan) => plan.audience],
    ['できること', (plan) => plan.summary],
    ['月額（税込）', (plan) => yen(plan.monthlyTaxIn)],
    ['12か月の合計（税込）', (plan) => yen(plan.termTotalTaxIn)],
  ];
  return el('table', { class: 'compare' }, [
    el('thead', null, [head]),
    el('tbody', null, rows.map(([label, cell]) => el('tr', null, [
      el('th', { scope: 'row' }, [label]),
      ...SERVICE_PLANS.map((plan) => el('td', null, [cell(plan)])),
    ]))),
  ]);
}


function termsBody(heading: string): string {
  if (heading.startsWith('契約の成立')) return '相談・申し込みフォームの送信だけでは、契約は成立しません。支払いの画面は未実装です。成立の細目は【未定】です。';
  if (heading.startsWith('料金と継続課金')) return `${CONTRACT_NOTE}${INITIAL_FEE_NOTE}。`;
  if (heading === '解約') return '期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。手続きの期限と方法は【未定】です。自動更新は【未定】です。解約後はチャットを停止します。';
  return UNDECIDED;
}

function faqAnswer(question: string, answer: string): (Node | string)[] {
  if (question === '個人情報は扱いますか') {
    return [
      '申し込みに必要な連絡先は、案内と契約のためだけに使います。店の顧客情報は、公開情報の範囲で設定します。詳細は',
      el('a', { href: '/privacy' }, ['個人情報の取り扱い']),
      'をご覧ください。',
    ];
  }
  if (question === '支払い方法は何ですか') {
    return [
      '今回のフォームでは決済しません。支払いの画面（Stripe）は後から用意する予定です。料金の表は',
      el('a', { href: '/plans' }, ['プランのページ']),
      'をご覧ください。',
    ];
  }
  return [answer];
}

