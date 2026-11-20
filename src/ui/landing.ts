import {
  DELIVERY_DAYS,
  DEMO_INDUSTRIES,
  DEMO_PLAN_ID,
  FICTIONAL_SHOP,
  REPLY_WINDOW,
  SERVICE_PLANS,
  widgetPath,
  yen,
  type ServicePlan,
} from '../content/service';
import { JUKU_CHIPS, PAINT_CHIPS, SEITAI_CHIPS } from '../lib/guides';
import type { PlanId } from '../types';
import { PLAN_LABEL } from '../types';
import { el } from './dom';
import { pageShell } from './site-chrome';

const SHOT = {
  shop: '/shots/shop-aoba.png',
  estimate: '/shots/paint-estimate.png',
  paintStart: '/shots/paint-start.png',
  paintBook: '/shots/paint-book.png',
  jukuStart: '/shots/juku-start.png',
  seitaiStart: '/shots/seitai-start.png',
  admin: '/shots/admin-aoba.png',
};

export function landingPage(): HTMLElement {
  return pageShell('/', [
    hero(),
    industryBand(),
    timeline(),
    comparison(),
    mechanism(),
    demoSection(),
    adminSection(),
    industryRows(),
    canCannot(),
    pricing(),
    flowTable(),
    faqAccordion(),
    operatorBox(),
    finalCta(),
  ]);
}

function hero(): HTMLElement {
  return el('section', { class: 'hero' }, [
    el('div', { class: 'wrap hero-layout' }, [
      el('p', { class: 'eyebrow' }, ['外壁塗装・学習塾・整体院のホームページに']),
      el('h1', null, [
        el('span', { class: 'hero-line' }, ['電話に出られない時間の「いくら？」に、']),
        el('span', { class: 'hero-line' }, ['ホームページが答えます']),
      ]),
      el('div', { class: 'hero-copy' }, [
        el('p', { class: 'lede' }, ['お客様はボタンを選ぶだけ。お店が用意した答えだけを返す、選択式の受付チャットです。']),
        el('div', { class: 'cta-row' }, [
          el('a', { class: 'button', href: '#demo' }, ['デモを試す']),
          el('a', { class: 'button ghost', href: '#plans' }, ['料金を見る']),
        ]),
        el('ul', { class: 'fact-chips' }, [
          el('li', null, ['初期費用0円（設置・基本設定込み）']),
          el('li', null, ['月額10,780円（税込）から']),
          el('li', null, ['Web完結・訪問なし']),
        ]),
      ]),
      el('div', { class: 'hero-visual' }, [
        el('div', { class: 'laptop' }, [
          el('div', { class: 'laptop-bar' }, [el('span', null, ['あおば塗装（架空）'])]),
          el('img', { src: SHOT.shop, alt: '架空の塗装店のホームページ。右下にチャットのボタンがあります。' }),
        ]),
        phoneFrame(el('img', { class: 'phone-shot', src: SHOT.estimate, alt: '' })),
        el('p', { class: 'shot-caption' }, ['画面は架空の塗装店のデモです。金額は架空の価格表によります。']),
      ]),
    ]),
  ]);
}

function industryBand(): HTMLElement {
  const items = [
    { href: '/demo/painting', name: '外壁・屋根塗装', quote: PAINT_CHIPS[0]?.label ?? '' },
    { href: '/demo/juku', name: '学習塾', quote: JUKU_CHIPS[1]?.label ?? '' },
    { href: '/demo/seitai', name: '自費の整体院', quote: SEITAI_CHIPS[2]?.label ?? '' },
  ];
  return el('section', { class: 'band band-thin', id: 'industries' }, [
    el('div', { class: 'wrap thin-row' }, [
      el('p', { class: 'thin-label' }, ['すぐ試せる業種テンプレート']),
      el('div', { class: 'thin-items' }, items.map((item) => el('a', { class: 'thin-item', href: item.href }, [
        el('strong', null, [item.name]),
        el('span', null, [`「${item.quote}」`]),
      ]))),
    ]),
  ]);
}

function timeline(): HTMLElement {
  const events = [
    { time: '10:30', who: '整体院', body: '施術中で電話に出られない。「初めてですが、服装は？」' },
    { time: '13:00', who: '塗装', body: '足場の上で着信に気づかない。' },
    { time: '17:30', who: '学習塾', body: '授業が始まり、受付に人がいない。' },
    { time: '21:00', who: '塗装', body: '夜、スマホで「外壁塗装 いくら」と調べている人がいる。' },
    { time: '22:30', who: '学習塾', body: '保護者が、授業料のページを見ている。' },
  ];
  return el('section', { class: 'block', id: 'hours' }, [
    el('div', { class: 'wrap' }, [
      el('p', { class: 'eyebrow' }, ['こんなこと、ありませんか']),
      el('h2', null, ['お客様が聞きたい時間に、お店は手が離せない']),
      el('p', { class: 'section-lead' }, ['問い合わせは、営業時間の中だけに来るわけではありません。']),
      el('div', { class: 'axis', 'aria-hidden': 'true' }, [
        el('span', null, ['9:00']),
        el('span', { class: 'axis-track' }, [
          el('i', { class: 'axis-band day' }, []),
          el('i', { class: 'axis-band night' }, []),
        ]),
        el('span', null, ['24:00']),
      ]),
      el('p', { class: 'axis-note' }, ['例']),
      el('ol', { class: 'timeline' }, events.map((item) => el('li', null, [
        el('time', null, [item.time]),
        el('p', null, [el('strong', null, [item.who]), item.body]),
      ]))),
      el('p', { class: 'section-lead' }, ['折り返しの電話を待たずに、ほかのお店に問い合わせる人もいます。']),
    ]),
  ]);
}

function comparison(): HTMLElement {
  const head = ['', '電話', '問い合わせフォーム', 'BOTLIA'];
  const rows = [
    ['営業時間外・作業中', '× 出られない', '○ 受け付けられる', '○ 受け付けられる'],
    ['その場で答えが出るか', '○ 出られればすぐ', '× 返信を待つ', '○ 用意した答えをすぐ表示'],
    ['お店の手間', '1件ずつ対応', '1件ずつ返信', '同じ質問は自動で案内'],
    ['答えの正確さ', '話す人による', '返信する人による', 'お店が決めた文面だけ'],
    ['予約の確定', 'その場で取れる', 'やりとりして確定', '既存の予約ページへ案内'],
    ['費用', '人の時間', 'ほぼ無料のものが多い', '月額10,780円（税込）から'],
  ];
  return el('section', { class: 'block band-blue' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['電話、問い合わせフォーム、受付ボットのちがい']),
      el('p', { class: 'section-lead' }, ['受付ボットは電話をなくすものではありません。電話に出られない時間を受け持ちます。']),
      el('div', { class: 'table-scroll' }, [
        el('table', { class: 'compare diff' }, [
          el('thead', null, [el('tr', null, head.map((label, index) => el('th', { scope: 'col' }, [
            label,
            ...(index === 3 ? [el('span', { class: 'col-tag' }, ['このサービス'])] : []),
          ])))]),
          el('tbody', null, rows.map((row) => el('tr', null, row.map((cell, index) => (
            index === 0 ? el('th', { scope: 'row' }, [cell]) : el('td', null, [cell])
          ))))),
        ]),
      ]),
      el('p', { class: 'price-footnote' }, ['※受付ボットは、お店が用意した質問と答えを選択式で返します。AIによる自由な文章は作りません。']),
    ]),
  ]);
}

function mechanism(): HTMLElement {
  const steps = [
    { time: '21:04', title: 'お客様が質問を選ぶ', body: 'ホームページ右下のチャットを開き、「費用の目安を知る」を押します。', src: SHOT.paintStart, alt: 'あおば塗装のデモ。最初の質問ボタン。' },
    { time: '21:05', title: '3つ答えると、概算が出る', body: '建物（戸建て2階）、広さ（26〜35坪）、外壁の種類を選ぶと、お店の公開価格表にもとづく目安を表示します。', src: SHOT.estimate, alt: '外壁の目安が78万〜108万円（税込）と出た画面。' },
    { time: '21:06', title: '予約ページへ進む', body: '「無料の現地調査を予約する」を押すと、お店がいま使っている予約ページが開きます。ボットの中では予約を確定しません。', src: SHOT.paintBook, alt: '無料の現地調査を予約するボタンが出た画面。' },
  ];
  return el('section', { class: 'block', id: 'how' }, [
    el('div', { class: 'wrap' }, [
      el('p', { class: 'eyebrow' }, ['仕組み']),
      el('h2', null, ['夜9時の「外壁いくら？」は、', el('br', { class: 'h-break' }), 'こう受け付けます']),
      el('p', { class: 'section-lead' }, ['例・架空の塗装店']),
      el('ol', { class: 'mech' }, steps.map((step, index) => el('li', null, [
        el('div', { class: 'mech-copy' }, [
          el('span', { class: 'step-no' }, [String(index + 1).padStart(2, '0')]),
          el('p', { class: 'mech-time' }, [step.time]),
          el('h3', null, [step.title]),
          el('p', null, [step.body]),
        ]),
        el('img', { class: 'mech-shot', src: step.src, alt: step.alt }),
      ]))),
      el('p', { class: 'section-lead' }, ['用意していない質問には答えを作りません。電話・メール、または人への引き継ぎ（充実プラン）を案内します。']),
    ]),
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
  const expand = el('a', { class: 'demo-expand', href: `/demo/${industry.id}` }, ['大きな画面で開く']);
  const install = el('a', { class: 'button', href: `/consult?plan=${plan}` }, ['この業種で相談する']);
  const industryTabs = DEMO_INDUSTRIES.map((item, index) => tabButton(`demo-industry-${index}`, item.label, item.id === industry.id));
  const planIds: PlanId[] = ['light', 'standard', 'full'];
  const planTabs = planIds.map((id, index) => tabButton(`demo-plan-${index}`, PLAN_LABEL[id], id === plan));
  const panel = el('div', {
    id: 'demo-panel',
    class: 'demo-stage',
    role: 'tabpanel',
    'aria-labelledby': 'demo-industry-0',
  }, [el('div', { class: 'demo-device' }, [phoneFrame(frame, false)])]);
  const sync = () => {
    frame.src = widgetPath(plan, industry.slug);
    frame.title = `架空の店のチャット（${industry.label}・${PLAN_LABEL[plan]}）`;
    expand.href = `/demo/${industry.id}`;
    install.href = `/consult?plan=${plan}`;
    const selected = industryTabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    if (selected) panel.setAttribute('aria-labelledby', selected.id);
  };
  wireTabs(industryTabs, (index) => {
    industry = DEMO_INDUSTRIES[index];
    sync();
  });
  wireTabs(planTabs, (index) => {
    plan = planIds[index];
    sync();
  });
  return el('section', { class: 'block band', id: 'demo' }, [
    el('div', { class: 'wrap demo-split' }, [
      el('div', null, [
        el('h2', null, ['3つの業種のデモを、いま試せます']),
        el('p', { class: 'section-lead' }, [FICTIONAL_SHOP]),
        el('p', { class: 'tab-label' }, ['業種']),
        el('div', { class: 'tablist', role: 'tablist', 'aria-label': '業種' }, industryTabs),
        el('p', { class: 'tab-label' }, ['プラン']),
        el('div', { class: 'tablist', role: 'tablist', 'aria-label': 'プラン' }, planTabs),
        el('ul', { class: 'check-list' }, [
          el('li', null, ['塗装：建物と広さから、費用の目安が出る']),
          el('li', null, ['塾：学年と目的から、コースと月謝を案内する']),
          el('li', null, ['整体：初めての方へ、当日の流れと料金を案内する']),
        ]),
        el('p', null, [expand]),
        install,
      ]),
      panel,
    ]),
  ]);
}

function adminSection(): HTMLElement {
  const rows: [string, string][] = [
    ['質問と答えの追加・編集・削除', '標準・充実'],
    ['並び順の入れ替え', '標準・充実'],
    ['答えられなかった質問を受け取る（スタッフへの引き継ぎ）', '充実'],
  ];
  return el('section', { class: 'block', id: 'admin' }, [
    el('div', { class: 'wrap' }, [
      el('p', { class: 'eyebrow' }, ['標準・充実プラン']),
      el('h2', null, ['答えの文面は、お店で直せます']),
      el('p', { class: 'section-lead' }, ['料金が変わった、休みが増えた。そんなときは管理画面で質問と答えを書き換えます。']),
      el('div', { class: 'browser' }, [
        el('div', { class: 'browser-url' }, ['bot.arktechlab.com/admin']),
        el('img', { src: SHOT.admin, alt: 'あおば塗装（架空）の管理画面。質問の編集フォームが開いている。' }),
      ]),
      el('ol', { class: 'callouts' }, [
        el('li', null, ['質問と答えを追加・編集']),
        el('li', null, ['並び順を変える']),
        el('li', null, ['チャットへの表示']),
      ]),
      el('div', { class: 'table-scroll' }, [
        el('table', { class: 'compare' }, [
          el('tbody', null, rows.map(([name, who]) => el('tr', null, [
            el('th', { scope: 'row' }, [name]),
            el('td', null, [who]),
          ]))),
        ]),
      ]),
      el('p', { class: 'price-footnote' }, ['※ライトプランには管理画面がありません。文面の変更は相談フォームまたはメールでご連絡ください。']),
    ]),
  ]);
}

function industryRows(): HTMLElement {
  const rows = [
    { title: '外壁・屋根塗装', body: '見積りの前に気になる「費用」「工期」「工事中の生活」に答えます。', href: '/demo/painting', cta: '塗装のデモを見る', src: SHOT.paintStart, chips: PAINT_CHIPS, note: '' },
    { title: '学習塾', body: '授業中に届く保護者の質問に、授業料・体験・振替を案内します。', href: '/demo/juku', cta: '塾のデモを見る', src: SHOT.jukuStart, chips: JUKU_CHIPS, note: '' },
    { title: '自費の整体院', body: '初めての方が予約前に知りたい、当日の流れ・料金・服装を案内します。', href: '/demo/seitai', cta: '整体院のデモを見る', src: SHOT.seitaiStart, chips: SEITAI_CHIPS, note: '症状の改善や効果を約束する文言は入れません。' },
  ];
  return el('section', { class: 'block', id: 'trades' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['業種ごとに、', el('br', { class: 'h-break' }), 'よく聞かれる質問を', el('br', { class: 'h-break' }), '用意しています']),
      ...rows.map((row, index) => el('article', { class: index % 2 === 0 ? 'zig' : 'zig flip band-plain' }, [
        el('div', { class: 'zig-copy' }, [
          el('h3', null, [row.title]),
          el('p', null, [row.body]),
          ...(row.note ? [el('p', { class: 'price-footnote' }, [row.note])] : []),
          el('ul', { class: 'tags' }, row.chips.map((chip) => el('li', null, [chip.label]))),
          el('a', { href: row.href }, [row.cta]),
        ]),
        el('div', { class: 'zig-phone' }, [phoneFrame(el('img', { class: 'phone-shot', src: row.src, alt: `${row.title}のデモの最初の画面` }))]),
      ])),
    ]),
  ]);
}

function canCannot(): HTMLElement {
  const yes = [
    'お店の公開情報をもとにしたよくある質問の案内',
    '費用・コース・メニューの選択式の案内（標準・充実）',
    '既存の予約ページ・電話・メールへの案内',
    'お店による質問と答えの編集（標準・充実）',
    '答えられない質問を人に引き継ぐ（充実）',
  ];
  const no = [
    'ボットの中での予約の確定',
    'AIによる自由な文章での返答',
    'LINE連携（今後の予定）',
    '訪問・ビデオ通話での説明や設定',
    '効果や売上の保証',
  ];
  return el('section', { class: 'block' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['できること、できないこと']),
      el('p', { class: 'section-lead' }, ['契約の前に、ここだけは確認してください。']),
      el('div', { class: 'two-col' }, [
        el('ul', { class: 'yes-list' }, yes.map((item) => el('li', null, [item]))),
        el('ul', { class: 'no-list' }, no.map((item) => el('li', null, [item]))),
      ]),
    ]),
  ]);
}

function pricing(): HTMLElement {
  const features: [string, boolean, boolean, boolean][] = [
    ['よくある質問の自動案内', true, true, true],
    ['既存の予約ページへの案内', true, true, true],
    ['費用・コース・メニューの選択式案内', false, true, true],
    ['管理画面で質問と答えを編集', false, true, true],
    ['答えられない質問を人に引き継ぎ', false, false, true],
  ];
  const audiences = ['よくある質問を案内したい', '選択式の案内と、文面の編集をしたい', '人への引き継ぎもしたい'];
  return el('section', { class: 'block band-blue', id: 'plans' }, [
    el('div', { class: 'wrap' }, [
      el('p', { class: 'eyebrow' }, ['料金']),
      el('h2', null, ['初期費用0円。', el('br', { class: 'h-break' }), '月額10,780円', el('br', { class: 'h-break' }), '（税込）から']),
      el('p', { class: 'section-lead' }, ['設置と基本設定は初期費用0円に含まれます。12か月契約で、毎月お支払いいただきます。']),
      el('div', { class: 'plan-grid' }, SERVICE_PLANS.map((plan, index) => planCard(plan, audiences[index] ?? plan.audience))),
      el('div', { class: 'table-scroll' }, [
        el('table', { class: 'compare' }, [
          el('thead', null, [el('tr', null, [
            el('th', { scope: 'col' }, ['']),
            ...SERVICE_PLANS.map((plan) => el('th', { scope: 'col' }, [plan.name])),
          ])]),
          el('tbody', null, [
            ...features.map(([label, light, standard, full]) => el('tr', null, [
              el('th', { scope: 'row' }, [label]),
              ...[light, standard, full].map((on) => el('td', null, [on ? '○' : '—'])),
            ])),
            el('tr', null, [
              el('th', { scope: 'row' }, ['初期費用（設置・基本設定込み）']),
              ...SERVICE_PLANS.map(() => el('td', null, ['0円'])),
            ]),
          ]),
        ]),
      ]),
      el('div', { class: 'note-band' }, [
        el('p', null, ['初期費用0円（設置・基本設定込み）。料金は月額だけで、12か月契約・毎月払いです。']),
      ]),
      el('ul', { class: 'fine' }, [
        el('li', null, ['※金額は税込表示です（税別を併記）。']),
        el('li', null, ['※契約期間は12か月です。期間の途中で解約する場合も、残りの月数の料金をお支払いいただきます。']),
        el('li', null, ['※自動更新は【未定】です。']),
        el('li', null, ['※相談フォームでは決済しません。']),
        el('li', null, [
          '※詳しくは ',
          el('a', { href: '/terms' }, ['利用規約']),
          ' と ',
          el('a', { href: '/legal' }, ['特定商取引法に基づく表記']),
          ' をご覧ください。',
        ]),
      ]),
    ]),
  ]);
}

function planCard(plan: ServicePlan, audience: string): HTMLElement {
  const featured = plan.id === DEMO_PLAN_ID;
  return el('article', { class: featured ? 'plan-card is-recommended' : 'plan-card' }, [
    ...(featured ? [el('p', { class: 'recommend-badge' }, ['おすすめ'])] : []),
    el('h3', null, [plan.name]),
    el('p', { class: 'audience' }, [audience]),
    el('p', { class: 'price' }, [`月額 ${yen(plan.monthlyTaxIn)}（税込）`]),
    el('p', { class: 'price-note' }, [`税別 ${yen(plan.monthlyTaxEx)}`]),
    el('p', { class: 'price' }, [`12か月の合計 ${yen(plan.termTotalTaxIn)}（税込）`]),
    el('a', { class: 'button', href: `/consult?plan=${plan.id}` }, ['このプランで相談する']),
  ]);
}

function flowTable(): HTMLElement {
  const rows = [
    ['01', 'デモを試す', 'お店', 'いますぐ'],
    ['02', '相談フォームを送る（決済はしません）', 'お店', DELIVERY_DAYS],
    ['03', '内容を確認し、メールで返信', 'ARK', REPLY_WINDOW],
    ['04', '質問と答えを作り、お店が確認', 'ARK・お店', DELIVERY_DAYS],
    ['05', 'ホームページに設置して公開', 'ARK', DELIVERY_DAYS],
  ];
  return el('section', { class: 'block', id: 'flow' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['申し込みから公開まで']),
      el('p', { class: 'section-lead' }, ['やりとりはすべてWebとメールです。訪問やビデオ通話はありません。']),
      el('div', { class: 'table-scroll' }, [
        el('table', { class: 'compare flow-table' }, [
          el('thead', null, [el('tr', null, ['#', 'やること', 'だれが', '目安'].map((label) => el('th', { scope: 'col' }, [label])))]),
          el('tbody', null, rows.map((row) => el('tr', null, [
            el('th', { scope: 'row' }, [row[0] ?? '']),
            el('td', null, [row[1] ?? '']),
            el('td', { class: 'who' }, [row[2] ?? '']),
            el('td', { class: 'when' }, [row[3] ?? '']),
          ]))),
        ]),
      ]),
      el('p', { class: 'section-lead' }, ['今後、申し込み後の支払いもWebで完結する予定です（支払い画面は準備中です）。']),
    ]),
  ]);
}

function faqAccordion(): HTMLElement {
  const items: [string, (Node | string)[]][] = [
    ['初期費用はかかりますか？', ['かかりません。設置と基本設定も含めて0円です。料金は月額だけです。']],
    ['12か月の途中で解約できますか？', ['解約はできますが、残りの月数の料金をお支払いいただきます。手続きの期限は【未定】です。自動更新も【未定】です。']],
    ['用意していない質問をされたら？', ['答えを作らず、電話・メールをご案内します。充実プランでは、スタッフへの引き継ぎになります。']],
    ['いまのホームページに入れられますか？', ['入れられます。サイトの作り直しはしません。予約は、いまお使いの予約ページへご案内します。']],
    ['チャットで予約まで取れますか？', ['取れません。既存の予約ページか電話へご案内します。']],
    ['来てもらったり、オンラインで説明してもらえますか？', ['訪問とビデオ通話はしていません。相談フォームとメールで進めます。']],
    ['LINEでも使えますか？', ['いまは対応していません。今後の予定です。']],
    ['整体院でも使えますか？', ['使えます。症状の改善や効果を約束する文言は入れず、お店と相談して文面を決めます。']],
    ['デモと本番は何が違いますか？', ['デモの店名と料金は架空です。本番では、御社の公開情報に差し替えます。']],
  ];
  return el('section', { class: 'block band', id: 'faq' }, [
    el('div', { class: 'wrap narrow-copy' }, [
      el('h2', null, ['よくある質問']),
      ...items.map(([question, answer], index) => el('details', { class: 'acc', ...(index === 0 ? { open: 'true' } : {}) }, [
        el('summary', null, [el('span', { class: 'mark' }, ['Q']), question]),
        el('div', { class: 'acc-a' }, [el('span', { class: 'mark' }, ['A']), el('p', null, answer)]),
      ])),
      el('p', null, [el('a', { href: '/faq' }, ['よくある質問をすべて見る'])]),
    ]),
  ]);
}

function operatorBox(): HTMLElement {
  const rows: [string, (Node | string)[]][] = [
    ['サービス名', ['BOTLIA（ボットリア）']],
    ['運営', ['ARK（arktechlab.com）']],
    ['ご連絡', ['相談フォーム・メール']],
    ['返信の目安', [REPLY_WINDOW]],
    ['打ち合わせ', ['Webとメールのみ（訪問・ビデオ通話なし）']],
  ];
  return el('section', { class: 'block' }, [
    el('div', { class: 'wrap' }, [
      el('div', { class: 'operator' }, [
        el('p', { class: 'eyebrow' }, ['運営']),
        el('dl', null, rows.flatMap(([label, value]) => [
          el('dt', null, [label]),
          el('dd', null, value),
        ])),
        el('p', { class: 'operator-links' }, [
          el('a', { href: '/legal' }, ['特定商取引法に基づく表記']),
          el('a', { href: '/terms' }, ['利用規約']),
          el('a', { href: '/privacy' }, ['個人情報の取り扱い']),
        ]),
      ]),
    ]),
  ]);
}

function finalCta(): HTMLElement {
  return el('section', { class: 'final-cta' }, [
    el('div', { class: 'wrap' }, [
      el('h2', null, ['まずは、デモで動きを見てください']),
      el('div', { class: 'cta-boxes' }, [
        el('a', { class: 'cta-box', href: '#demo' }, [
          el('strong', null, ['デモを試す']),
          el('span', null, ['3業種の受付を、その場で操作できます。']),
        ]),
        el('a', { class: 'cta-box', href: '/consult' }, [
          el('strong', null, ['導入を相談する']),
          el('span', null, [`相談フォームを送るだけで、決済はしません。${REPLY_WINDOW}にメールで返信します。`]),
        ]),
      ]),
      el('p', { class: 'shot-caption light' }, ['初期費用0円（設置・基本設定込み）・月額10,780円（税込）から・12か月契約']),
    ]),
  ]);
}

function phoneFrame(screen: HTMLElement, home = true): HTMLElement {
  const status = el('div', { class: 'ios-status' }, [
    el('span', { class: 'ios-time' }, ['9:41']),
    el('span', { class: 'ios-island' }, []),
    el('span', { class: 'ios-right' }, []),
  ]);
  const right = status.querySelector('.ios-right');
  if (right) {
    right.innerHTML = '<svg viewBox="0 0 18 12" width="17" height="12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx=".5" fill="currentColor"/><rect x="5" y="5" width="3" height="7" rx=".5" fill="currentColor"/><rect x="10" y="2.5" width="3" height="9.5" rx=".5" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx=".5" fill="currentColor"/></svg><span class="ios-gen">5G</span><svg viewBox="0 0 28 13" width="26" height="13" aria-hidden="true"><rect x=".8" y=".8" width="22" height="11.4" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="2.4" y="2.4" width="16" height="8.2" rx="1.4" fill="currentColor"/><rect x="24.2" y="4" width="2.2" height="5" rx="1" fill="currentColor"/></svg>';
  }
  return el('div', { class: 'iphone' }, [
    el('span', { class: 'iphone-btn silent' }, []),
    el('span', { class: 'iphone-btn vol-up' }, []),
    el('span', { class: 'iphone-btn vol-down' }, []),
    el('span', { class: 'iphone-btn power' }, []),
    el('div', { class: 'iphone-bezel' }, [
      el('div', { class: 'iphone-screen' }, [
        status,
        screen,
        ...(home ? [el('div', { class: 'home-indicator' }, [])] : []),
      ]),
    ]),
  ]);
}

function tabButton(id: string, label: string, selected: boolean): HTMLButtonElement {
  return el('button', {
    id,
    type: 'button',
    class: 'tab',
    role: 'tab',
    'aria-selected': selected ? 'true' : 'false',
    'aria-controls': 'demo-panel',
    tabindex: selected ? '0' : '-1',
  }, [label]) as HTMLButtonElement;
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
    if (focus) tabs[next]?.focus();
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
