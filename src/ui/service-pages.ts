import type { PlanId } from '../types';
import { PLAN_LABEL } from '../types';
import {
  CONTRACT_NOTE,
  DELIVERY_DAYS,
  DEMO_INDUSTRIES,
  DEMO_PLAN_ID,
  FACTS,
  FAQ_ITEMS,
  FICTIONAL_SHOP,
  FUTURE_CHANGES,
  HERO_BODY,
  HERO_EYEBROW,
  HERO_TITLE,
  HOME_FAQ,
  INITIAL_FEE_NOTE,
  LEGAL_ITEMS,
  NOT_INCLUDED,
  PRICE_FOOTNOTE,
  PROBLEMS,
  REPLY_WINDOW,
  SERVICE_PLANS,
  TERMS_HEADINGS,
  UNDECIDED,
  priceListText,
  widgetPath,
  yen,
  type ServicePlan,
} from '../content/service';
import { el } from './dom';
import { pageShell } from './site-chrome';

export function landingView(): HTMLElement {
  return pageShell('/', [
    hero(),
    problemSection(),
    demoSection(),
    plansSection(true),
    flowSummary(),
    faqSummary(),
    closing(),
  ]);
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

function hero(): HTMLElement {
  return el('section', { class: 'hero' }, [
    el('div', { class: 'wrap hero-copy' }, [
      el('p', { class: 'eyebrow' }, [HERO_EYEBROW]),
      el('h1', null, [HERO_TITLE]),
      el('p', { class: 'lede' }, [HERO_BODY]),
      el('ul', { class: 'facts' }, FACTS.map((fact) => el('li', null, [fact]))),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '#demo' }, ['デモを試す']),
        el('a', { class: 'button ghost', href: '/consult' }, ['相談・申し込み']),
      ]),
    ]),
  ]);
}

function problemSection(): HTMLElement {
  return el('section', { class: 'block', id: 'problems' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['電話に出られない時間があります']),
      el('div', { class: 'issue-grid' }, PROBLEMS.map((item) => el('article', { class: 'panel issue-card' }, [
        el('h3', null, [item.title]),
        el('p', null, [item.body]),
      ]))),
    ]),
  ]);
}

function plansSection(onHome: boolean): HTMLElement {
  return el('section', { class: 'block', id: 'plans' }, [
    el('div', { class: 'wrap' }, [
      ...(onHome ? [el('h2', null, ['料金'])] : []),
      el('div', { class: 'plan-grid' }, SERVICE_PLANS.map((plan) => planCard(plan))),
      el('div', { class: 'compare-scroll' }, [compareTable()]),
      el('p', { class: 'price-footnote' }, [
        PRICE_FOOTNOTE,
        '詳細は',
        el('a', { href: '/terms' }, ['利用規約']),
        'と',
        el('a', { href: '/legal' }, ['特定商取引法に基づく表記']),
        'に書いています。',
      ]),
      el('p', { class: 'price-footnote' }, [`含まれないもの：${NOT_INCLUDED.join('、')}。`]),
      ...(onHome
        ? [el('div', { class: 'cta-row' }, [el('a', { class: 'button ghost', href: '/plans' }, ['プランの詳細'])])]
        : []),
    ]),
  ]);
}

function planCard(plan: ServicePlan): HTMLElement {
  return el('article', { class: 'plan-card' }, [
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

function demoSection(): HTMLElement {
  let industry = DEMO_INDUSTRIES[0];
  let plan: PlanId = DEMO_PLAN_ID;
  const frame = el('iframe', {
    class: 'demo-frame',
    title: `架空の店のチャット（${PLAN_LABEL[plan]}）`,
    src: widgetPath(plan, industry.slug),
    loading: 'lazy',
  }) as HTMLIFrameElement;
  const expand = el('a', { class: 'demo-expand', href: `/demo/${industry.id}` }, ['別ページで大きく見る']);
  const planNote = el('p', { class: 'plan-note' }, [planCaption(plan)]);
  const admin = adminPreview();
  const install = el('a', { class: 'demo-install', href: `/consult?plan=${plan}` }, ['このテンプレートを自社サイトに導入する →']);
  const industryTabs = DEMO_INDUSTRIES.map((item, index) => tabButton(`demo-industry-${index}`, item.label, item.id === industry.id));
  const planIds: PlanId[] = ['light', 'standard', 'full'];
  const planTabs = planIds.map((id, index) => tabButton(`demo-plan-${index}`, PLAN_LABEL[id], id === plan));
  const panel = el('div', {
    id: 'demo-panel',
    class: 'demo-stage',
    role: 'tabpanel',
    'aria-labelledby': 'demo-industry-0',
  }, [frame]);
  function sync(): void {
    frame.src = widgetPath(plan, industry.slug);
    frame.title = `架空の店のチャット（${industry.label}・${PLAN_LABEL[plan]}）`;
    expand.href = `/demo/${industry.id}`;
    planNote.textContent = planCaption(plan);
    admin.hidden = plan === 'light';
    install.href = `/consult?plan=${plan}`;
    const selected = industryTabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    if (selected) panel.setAttribute('aria-labelledby', selected.id);
  }
  wireTabs(industryTabs, (index) => {
    industry = DEMO_INDUSTRIES[index];
    sync();
  });
  wireTabs(planTabs, (index) => {
    plan = planIds[index];
    sync();
  });
  return el('section', { class: 'block demo-block', id: 'demo' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['その場で動かせます']),
      el('p', null, [`${FICTIONAL_SHOP}業種とプランを切り替えて、質問を選んでください。予約は既存のページへ案内するだけで、ボットの中では確定しません。`]),
      el('div', { class: 'tablist', role: 'tablist', 'aria-label': '業種' }, industryTabs),
      el('div', { class: 'tablist', role: 'tablist', 'aria-label': 'プラン' }, planTabs),
      planNote,
      panel,
      el('p', { class: 'demo-install-row' }, [install]),
      admin,
      el('p', { class: 'demo-expand-row' }, [expand]),
    ]),
  ]);
}

function planCaption(plan: PlanId): string {
  if (plan === 'light') return 'ライト：用意した質問への回答だけを返します。';
  if (plan === 'full') return '充実：選択式の案内に加えて、人へ引き継げます。';
  return '標準：選択式の案内と、管理画面の見本です。';
}

function adminPreview(): HTMLElement {
  return el('aside', { class: 'admin-sample' }, [
    el('h3', null, ['管理画面の見本']),
    el('p', { class: 'hint' }, ['標準以上では、お店が質問と答えを直せます。これは見本です。']),
    el('article', { class: 'faq-card' }, [
      el('h4', null, ['現地調査は無料ですか']),
      el('p', null, ['無料です。調査のあと、金額は見積書でお出しします。']),
    ]),
  ]);
}

function flowSummary(): HTMLElement {
  return el('section', { class: 'block', id: 'flow' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['導入は3ステップです']),
      el('ol', { class: 'steps' }, [
        el('li', null, ['デモで動きを見る。店の名前と料金は架空です。']),
        el('li', null, ['相談・申し込みフォームを送る。この送信では決済しません。']),
        el('li', null, [`${REPLY_WINDOW}にメールで返信します。訪問やビデオ通話はありません。`]),
      ]),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button ghost', href: '/flow' }, ['詳しい流れ']),
      ]),
    ]),
  ]);
}

function faqSummary(): HTMLElement {
  return el('section', { class: 'block', id: 'faq' }, [
    el('div', { class: 'wrap narrow-copy' }, [
      el('h2', null, ['よくある質問']),
      el('div', { class: 'faq-list' }, HOME_FAQ.map((item) => el('article', { class: 'faq-item' }, [
        el('h3', null, [item.question]),
        el('p', null, [item.answer]),
      ]))),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button ghost', href: '/faq' }, ['よくある質問の一覧']),
      ]),
    ]),
  ]);
}

function termsBody(heading: string): string {
  if (heading.startsWith('契約の成立')) return '相談・申し込みフォームの送信だけでは、契約は成立しません。支払いの画面は未実装です。成立の細目は【未定】です。';
  if (heading.startsWith('料金と継続課金')) return `${CONTRACT_NOTE}${INITIAL_FEE_NOTE}。`;
  if (heading === '解約') return '期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。手続きの期限と方法は【未定】です。自動更新は【未定】です。解約後はチャットを停止します。';
  return UNDECIDED;
}

function tabButton(id: string, label: string, selected: boolean): HTMLButtonElement {
  const button = el('button', {
    id,
    type: 'button',
    class: 'tab',
    role: 'tab',
    'aria-selected': selected ? 'true' : 'false',
    'aria-controls': 'demo-panel',
    tabindex: selected ? '0' : '-1',
  }, [label]) as HTMLButtonElement;
  return button;
}

function wireTabs(tabs: HTMLButtonElement[], onPick: (index: number) => void): void {
  const choose = (index: number, focus: boolean) => {
    const next = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, item) => {
      const on = item === next;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    onPick(next);
    if (focus) tabs[next].focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => choose(index, false));
    tab.addEventListener('keydown', (event) => {
      const key = event.key;
      if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
      event.preventDefault();
      if (key === 'Home') choose(0, true);
      else if (key === 'End') choose(tabs.length - 1, true);
      else if (key === 'ArrowRight') choose(index + 1, true);
      else choose(index - 1 + tabs.length, true);
    });
  });
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
      el('h2', null, ['フォームから相談を送れます']),
      el('p', null, ['この画面では決済しません。いまは自動返信メールは送りません。内容を確認のうえ、通常【〇営業日】以内にメールで返信します。訪問やビデオ通話はありません。']),
      el('div', { class: 'cta-row' }, [
        el('a', { class: 'button', href: '/consult' }, ['相談・申し込み']),
      ]),
    ]),
  ]);
}
