import type { PlanId } from '../types';
import { PLAN_LABEL } from '../types';
import {
  CAN,
  CANNOT,
  DEMO_INDUSTRIES,
  DEMO_PLAN_ID,
  FACTS,
  FAQ_ITEMS,
  FICTIONAL_SHOP,
  HERO_BODY,
  HERO_EYEBROW,
  HERO_TITLE,
  LEGAL_ITEMS,
  MONITOR_NOTE,
  NOT_INCLUDED,
  PRICE_INTRO,
  SERVICE_PLANS,
  TERMS_HEADINGS,
  TOP_FAQ,
  widgetPath,
  yen,
  type ServicePlan,
} from '../content/service';
import { el } from './dom';
import { pageShell } from './site-chrome';

export function landingView(): HTMLElement {
  return pageShell('/', [
    hero(),
    scopeSection(),
    plansSection(true),
    demoSection(),
    flowSummary(),
    faqSummary(),
    closing(),
  ]);
}

export function plansView(): HTMLElement {
  return pageShell('/plans', [
    el('div', { class: 'wrap page-intro' }, [
      el('h1', null, ['プランと料金']),
      el('p', null, [PRICE_INTRO]),
    ]),
    plansSection(false),
    el('div', { class: 'wrap' }, [
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['Webから相談する']),
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
        el('li', null, ['内容を確認のうえ、通常【〇営業日】以内にメールで返信します。訪問やビデオ通話はありません。']),
      ]),
      el('h2', null, ['今後の予定（いまは未実装です）']),
      el('p', null, ['ここから先は、まだこのサイトにはありません。']),
      el('ol', { class: 'steps' }, [
        el('li', null, ['フォーム送信後の自動返信（料金・規約）。']),
        el('li', null, ['利用規約に同意のうえ、最終確認画面から Stripe で初期費用と月額を支払う。']),
        el('li', null, ['支払い確認後、設置案内をメールまたは共有ページで渡す。訪問しての設定はしません。納期は【　】日。']),
        el('li', null, ['設置後の修正は、管理画面のフォームで受け付けます。月1回まで無料です。']),
      ]),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['Webから相談する']),
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
        el('a', { class: 'button', href: '/consult' }, ['Webから相談する']),
      ]),
    ]),
  ]);
}

export function legalView(): HTMLElement {
  return pageShell('/legal', [
    el('div', { class: 'wrap page-intro narrow-copy' }, [
      el('h1', null, ['特定商取引法に基づく表記']),
      el('p', null, ['通信販売の表示として、次の項目を置きます。内容は準備中です。']),
      el('p', null, ['訪問販売としては構成しません。']),
      el('dl', { class: 'blank-list' }, LEGAL_ITEMS.flatMap((label) => [
        el('dt', null, [label]),
        el('dd', null, ['【未定】']),
      ])),
    ]),
  ], true);
}

export function termsView(): HTMLElement {
  return pageShell('/terms', [
    el('div', { class: 'wrap page-intro narrow-copy' }, [
      el('h1', null, ['利用規約']),
      el('p', null, ['要点の見出しだけを置いています。本文は【未定】です。']),
      el('p', null, ['相談・申し込みフォームの送信だけでは、契約は成立しません。支払いの画面は未実装です。']),
      ...TERMS_HEADINGS.flatMap((heading) => [
        el('h2', null, [heading]),
        el('p', null, ['【未定】']),
      ]),
    ]),
  ], true);
}

function hero(): HTMLElement {
  return el('section', { class: 'hero' }, [
    el('div', { class: 'wrap' }, [
      el('p', { class: 'eyebrow' }, [HERO_EYEBROW]),
      el('h1', null, [HERO_TITLE]),
      el('p', { class: 'lede' }, [HERO_BODY]),
      el('ul', { class: 'facts' }, FACTS.map((fact) => el('li', null, [fact]))),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['相談・申し込み']),
        el('a', { class: 'button ghost', href: '#plans' }, ['料金とデモを見る']),
      ]),
    ]),
  ]);
}

function scopeSection(): HTMLElement {
  return el('section', { class: 'block', id: 'scope' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['同じ質問が、くり返し届くことがあります']),
      el('p', null, ['営業時間、料金、予約の方法、駐車場など、予約の前によく聞かれることがあります。チャットは、公開情報をもとに案内するためのものです。電話の代わりになるとは言いません。']),
      el('div', { class: 'split' }, [
        el('div', { class: 'panel' }, [
          el('h3', null, ['できること']),
          el('ul', null, CAN.map((item) => el('li', null, [item]))),
        ]),
        el('div', { class: 'panel' }, [
          el('h3', null, ['できないこと']),
          el('ul', null, CANNOT.map((item) => el('li', null, [item]))),
        ]),
      ]),
    ]),
  ]);
}

function plansSection(onHome: boolean): HTMLElement {
  return el('section', { class: 'block', id: 'plans' }, [
    el('div', { class: 'wrap' }, [
      ...(onHome
        ? [
          el('h2', null, ['3つのプランから選べます']),
          el('p', null, [PRICE_INTRO]),
        ]
        : []),
      el('div', { class: 'plan-grid' }, SERVICE_PLANS.map((plan) => planCard(plan))),
      el('div', { class: 'compare-scroll' }, [compareTable()]),
      el('p', null, [`含まれないもの：${NOT_INCLUDED.join('、')}。`]),
      el('p', null, [MONITOR_NOTE]),
      ...(onHome
        ? [el('div', { class: 'cta-row' }, [el('a', { class: 'button ghost', href: '/plans' }, ['プランの詳細'])])]
        : []),
    ]),
  ]);
}

function planCard(plan: ServicePlan): HTMLElement {
  const demoDefault = plan.id === DEMO_PLAN_ID;
  return el('article', { class: demoDefault ? 'plan-card is-demo-default' : 'plan-card' }, [
    el('h3', null, [plan.name]),
    ...(demoDefault ? [el('p', { class: 'plan-flag' }, ['デモで最初に表示するプラン'])] : []),
    el('p', { class: 'audience' }, [plan.audience]),
    el('p', { class: 'price' }, [`初期 ${yen(plan.initialTaxIn)}（税込）`]),
    el('p', { class: 'price-note' }, [`税別 ${yen(plan.initialTaxEx)}`]),
    el('p', { class: 'price' }, [`月額 ${yen(plan.monthlyTaxIn)}（税込）`]),
    el('p', { class: 'price-note' }, [`税別 ${yen(plan.monthlyTaxEx)}`]),
    el('p', null, [plan.summary]),
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
    ['向いている相手', (plan) => plan.audience],
    ['できること', (plan) => plan.summary],
    ['初期費用（税込）', (plan) => yen(plan.initialTaxIn)],
    ['初期費用（税別）', (plan) => yen(plan.initialTaxEx)],
    ['月額（税込）', (plan) => yen(plan.monthlyTaxIn)],
    ['月額（税別）', (plan) => yen(plan.monthlyTaxEx)],
  ];
  return el('table', { class: 'compare' }, [
    el('thead', null, [head]),
    el('tbody', null, rows.map(([label, cell]) => el('tr', null, [
      el('th', { scope: 'row' }, [label]),
      ...SERVICE_PLANS.map((plan) => el('td', null, [cell(plan)])),
    ]))),
  ]);
}

function demoSection(): HTMLElement {
  let industry = DEMO_INDUSTRIES[0];
  let plan: PlanId = DEMO_PLAN_ID;
  const frame = el('iframe', {
    class: 'demo-frame',
    title: `架空の店のチャット（${PLAN_LABEL[plan]}）`,
    src: widgetPath(plan, industry.slug),
    loading: 'lazy',
  }) as HTMLIFrameElement;
  const expand = el('a', { class: 'demo-expand', href: `/demo/${plan}` }, ['別ページで大きく見る']);
  const industryTabs = DEMO_INDUSTRIES.map((item) => el('button', {
    type: 'button',
    class: 'tab',
    role: 'tab',
    'aria-selected': item.id === industry.id ? 'true' : 'false',
  }, [item.label]) as HTMLButtonElement);
  const planTabs = (['light', 'standard', 'full'] as PlanId[]).map((id) => el('button', {
    type: 'button',
    class: 'tab',
    role: 'tab',
    'aria-selected': id === plan ? 'true' : 'false',
  }, [PLAN_LABEL[id]]) as HTMLButtonElement);
  function sync(): void {
    frame.src = widgetPath(plan, industry.slug);
    frame.title = `架空の店のチャット（${PLAN_LABEL[plan]}）`;
    expand.href = `/demo/${plan}`;
  }
  industryTabs.forEach((button, index) => {
    button.addEventListener('click', () => {
      industry = DEMO_INDUSTRIES[index];
      for (const tab of industryTabs) tab.setAttribute('aria-selected', tab === button ? 'true' : 'false');
      sync();
    });
  });
  planTabs.forEach((button, index) => {
    button.addEventListener('click', () => {
      plan = (['light', 'standard', 'full'] as PlanId[])[index];
      for (const tab of planTabs) tab.setAttribute('aria-selected', tab === button ? 'true' : 'false');
      sync();
    });
  });
  return el('section', { class: 'block demo-block', id: 'demo' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['実際に触って、動きを確かめてください']),
      el('p', null, [`${FICTIONAL_SHOP}業種とプランを切り替えて試せます。予約は既存の予約ページへ案内するだけで、ボットの中では確定しません。`]),
      el('div', { class: 'tablist', role: 'tablist', 'aria-label': '業種' }, industryTabs),
      el('div', { class: 'tablist', role: 'tablist', 'aria-label': 'プラン' }, planTabs),
      el('div', { class: 'demo-stage' }, [frame]),
      el('p', { class: 'demo-expand-row' }, [expand]),
      el('p', { class: 'note' }, [`${FICTIONAL_SHOP}実在のお店の画面ではありません。`]),
    ]),
  ]);
}

function flowSummary(): HTMLElement {
  return el('section', { class: 'block', id: 'flow' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['相談から導入までの流れ']),
      el('h3', null, ['いまの手順']),
      el('ol', { class: 'steps' }, [
        el('li', null, ['このページのデモやFAQで動きを見る']),
        el('li', null, ['相談・申し込みフォームを送る（決済しない。自動返信メールは送らない）']),
        el('li', null, ['通常【〇営業日】以内にメールで返信する。訪問やビデオ通話はない。']),
      ]),
      el('h3', null, ['今後の予定（いまは未実装です）']),
      el('p', null, ['フォーム送信後の自動返信（料金・規約）、利用規約に同意のうえ最終確認画面から Stripe で初期費用と月額を支払うこと、支払い確認後の設置案内。']),
      el('p', null, ['設置後の修正は、管理画面のフォームで、月1回まで無料です。']),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button ghost', href: '/flow' }, ['詳しい流れ']),
        el('a', { class: 'button', href: '/consult' }, ['相談・申し込み']),
      ]),
    ]),
  ]);
}

function faqSummary(): HTMLElement {
  return el('section', { class: 'block', id: 'faq' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['よくある質問']),
      el('ul', null, TOP_FAQ.map((item) => el('li', null, [item]))),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button ghost', href: '/faq' }, ['よくある質問の一覧']),
      ]),
    ]),
  ]);
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

function closing(): HTMLElement {
  return el('section', { class: 'closing' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['相談も、Webだけで進められます']),
      el('p', null, ['必要事項をフォームから送ってください。この画面では決済しません。いまは自動返信メールは送りません。内容を確認のうえ、通常【〇営業日】以内にメールで返信します。訪問やビデオ通話はありません。']),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['相談・申し込み']),
      ]),
    ]),
  ]);
}
