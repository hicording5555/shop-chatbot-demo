import type { PlanId, Shop } from '../types';
import { containsEfficacyClaim } from '../types';
import {
  GRADE_LABEL,
  GOAL_LABEL,
  estimatePainting,
  formatYen,
  jukuCourse,
  jukuGradeSpan,
  paintingWideRange,
  templateBySlug,
  type NicheTemplate,
} from '../data/templates';
import type { BotMessage, ChatButton } from './flow';

export interface GuideCursor {
  flowId: string;
  answers: Record<string, string>;
}

export interface GuideTurn {
  guide: GuideCursor | null;
  userText: string;
  bot: BotMessage;
}

const NO_PUSH = 'しつこい営業電話はしません。';

export const PAINT_CHIPS: ChatButton[] = [
  { id: 'flow:cost', label: '費用の目安を知る' },
  { id: 'flow:survey', label: '無料の現地調査について' },
  { id: 'flow:schedule', label: '工期・雨の日の対応' },
  { id: 'flow:color', label: '塗料・色選びの相談' },
  { id: 'flow:warranty', label: '保証・アフターフォロー' },
  { id: 'flow:living', label: '工事中の生活（洗濯物・駐車・近隣挨拶）' },
  { id: 'flow:book', label: '無料の現地調査を予約する' },
];

export const JUKU_CHIPS: ChatButton[] = [
  { id: 'flow:price', label: '授業料・費用について' },
  { id: 'flow:trial', label: '無料体験・学習相談について' },
  { id: 'flow:course', label: '学年・教科・通う回数' },
  { id: 'flow:timetable', label: '時間割・部活や習い事との両立' },
  { id: 'flow:makeup', label: '振替（欠席したとき）' },
  { id: 'flow:exam', label: '定期テスト・受験対策' },
  { id: 'flow:book', label: '無料体験を予約する' },
];

export const SEITAI_CHIPS: ChatButton[] = [
  { id: 'flow:first', label: '初めての方へ（当日の流れ）' },
  { id: 'flow:price', label: '料金・所要時間' },
  { id: 'flow:clothes', label: '服装・着替え' },
  { id: 'flow:cancel', label: '予約・キャンセル・支払い' },
  { id: 'flow:insurance', label: '保険は使えますか？' },
  { id: 'flow:area', label: '気になる箇所からコースを見る' },
  { id: 'flow:book', label: 'ご予約・空き確認' },
];

export function templateOf(shop: Shop): NicheTemplate | undefined {
  return templateBySlug(shop.slug);
}

export function templateIntro(plan: PlanId, shop: Shop): string {
  const planLine =
    plan === 'light'
      ? '用意した質問に、そのまま答えます。'
      : plan === 'full'
        ? '選択肢で案内します。答えられない内容は、人へ引き継げます。'
        : '選択肢で絞って、目安をお出しします。';
  if (shop.industry === 'painting') return `外壁・屋根のご相談窓口です。30秒で費用の目安がわかります。${planLine}`;
  if (shop.industry === 'juku') return `学年と目的から、コースと月額の目安をご案内します。${planLine}`;
  return `気になる場所から、メニューと時間・料金の目安をご案内します。${planLine}`;
}

export function templateHomeButtons(plan: PlanId, shop: Shop, locked: boolean): ChatButton[] {
  const chips = shop.industry === 'painting' ? PAINT_CHIPS : shop.industry === 'juku' ? JUKU_CHIPS : SEITAI_CHIPS;
  const staff = plan === 'full' && shop.plan === 'full' ? [{ id: 'handoff:ask', label: 'スタッフに聞く' }] : [];
  const reset = locked ? [] : [{ id: 'industry:reset', label: '業種を選び直す' }];
  return [...chips, ...staff, ...reset];
}

export function guideButton(plan: PlanId, shop: Shop, guide: GuideCursor | null, id: string): GuideTurn | null {
  const template = templateOf(shop);
  if (!template) return null;
  if (id.startsWith('flow:')) {
    const flowId = id.slice('flow:'.length);
    return openFlow(plan, template, flowId);
  }
  if (!id.startsWith('opt:') || !guide) return null;
  const parts = id.split(':');
  const stepId = parts[1] ?? '';
  const optionId = parts[2] ?? '';
  const answers = { ...guide.answers, [stepId]: optionId };
  return advance(template, guide.flowId, stepId, optionId, answers);
}

export function guideFromText(plan: PlanId, shop: Shop, text: string): GuideTurn | null {
  const template = templateOf(shop);
  if (!template) return null;
  if (containsEfficacyClaim(text) || /ヘルニア|診断|病気|完治/.test(text)) return null;
  const folded = text.replace(/\s/g, '');
  if (template.id === 'painting' && /費用|いくら|価格/.test(folded)) return openFlow(plan, template, 'cost');
  if (template.id === 'painting' && /見積|現地調査/.test(folded)) return openFlow(plan, template, 'survey');
  if (template.id === 'painting' && /雨漏り|ひび割れ|ひび/.test(folded)) return openFlow(plan, template, 'symptom');
  if (template.id === 'juku' && /授業料|月謝/.test(folded)) return openFlow(plan, template, 'price');
  if (template.id === 'juku' && /体験/.test(folded)) return openFlow(plan, template, 'trial');
  if (template.id === 'juku' && /コース|学年/.test(folded)) return openFlow(plan, template, 'course');
  if (template.id === 'seitai' && /保険/.test(folded)) return openFlow(plan, template, 'insurance');
  if (template.id === 'seitai' && /首|肩|腰|姿勢/.test(folded)) return openFlow(plan, template, 'area');
  return null;
}

function openFlow(plan: PlanId, template: NicheTemplate, flowId: string): GuideTurn | null {
  const chip = [...PAINT_CHIPS, ...JUKU_CHIPS, ...SEITAI_CHIPS].find((item) => item.id === `flow:${flowId}`);
  const userText = chip?.label ?? '質問';
  if (plan === 'light' || !isWizard(flowId)) {
    const bot = (plan === 'light' ? lightAnswer(template, flowId) : null) ?? directAnswer(template, flowId);
    return bot ? { guide: null, userText, bot } : null;
  }
  const first = firstStep(template, flowId);
  if (!first) {
    const bot = directAnswer(template, flowId);
    return bot ? { guide: null, userText, bot } : null;
  }
  return { guide: { flowId, answers: {} }, userText, bot: first };
}

function isWizard(flowId: string): boolean {
  return flowId === 'cost' || flowId === 'course' || flowId === 'area' || flowId === 'symptom' || flowId === 'process';
}

function advance(
  template: NicheTemplate,
  flowId: string,
  stepId: string,
  optionId: string,
  answers: Record<string, string>,
): GuideTurn {
  const userText = optionLabel(flowId, stepId, optionId);
  if (flowId === 'cost' && optionId === 'other') {
    return { guide: null, userText, bot: surveyOnly(template) };
  }
  if (flowId === 'cost' && stepId !== 'roof') {
    const next = costStep(stepId === 'building' ? 'size' : stepId === 'size' ? 'wall' : 'roof');
    return { guide: { flowId, answers }, userText, bot: next };
  }
  if (flowId === 'cost') return { guide: null, userText, bot: paintResult(template, answers) };
  if (flowId === 'symptom') return { guide: null, userText, bot: symptomResult(template, optionId) };
  if (flowId === 'process') return { guide: null, userText, bot: processResult(template, optionId) };
  if (flowId === 'course' && stepId === 'grade') {
    return { guide: { flowId, answers }, userText, bot: goalStep() };
  }
  if (flowId === 'course') return { guide: null, userText, bot: courseResult(template, answers) };
  if (flowId === 'area') return { guide: null, userText, bot: areaResult(template, optionId) };
  return { guide: null, userText, bot: backHome(template) };
}

function firstStep(template: NicheTemplate, flowId: string): BotMessage | null {
  if (flowId === 'cost') return costStep('building');
  if (flowId === 'symptom') {
    return message('気になっていることを選んでください。', [
      opt('symptom', 'leak', 'いま雨漏りしている'),
      opt('symptom', 'crack', 'シミ・ひび割れ'),
      opt('symptom', 'fade', '色あせ・触ると白い粉がつく'),
      opt('symptom', 'when', '塗り替えの時期か知りたい'),
    ]);
  }
  if (flowId === 'process') {
    return message('知りたいことを選んでください。', [
      opt('topic', 'days', '工事期間'),
      opt('topic', 'greet', '近所へのあいさつ'),
      opt('topic', 'pay', '支払い'),
      opt('topic', 'warranty', '保証'),
      opt('topic', 'visit', '訪問営業との違い'),
    ]);
  }
  if (flowId === 'course') {
    return message('学年を選んでください。', [
      opt('grade', 'elementary', '小学生'),
      opt('grade', 'junior', '中学生'),
      opt('grade', 'high', '高校生'),
    ]);
  }
  if (flowId === 'area' && template.seitai) {
    return message('気になる場所を選んでください。', [
      opt('area', 'neck', '首・肩まわり'),
      opt('area', 'waist', '腰まわり'),
      opt('area', 'posture', '姿勢・疲労ケア'),
    ]);
  }
  return null;
}

function costStep(step: 'building' | 'size' | 'wall' | 'roof'): BotMessage {
  if (step === 'building') {
    return message('建物の種類を選んでください。', [
      opt('building', 'house2', '戸建て2階'),
      opt('building', 'house3', '戸建て3階'),
      opt('building', 'other', 'アパート・その他'),
    ]);
  }
  if (step === 'size') {
    return message('延床面積の目安を選んでください。', [
      opt('size', 's25', '〜25坪'),
      opt('size', 's35', '26〜35坪'),
      opt('size', 's45', '36〜45坪'),
      opt('size', 's46', '46坪〜'),
      opt('size', 'unknown', 'わからない'),
    ]);
  }
  if (step === 'wall') {
    return message('外壁の種類を選んでください。', [
      opt('wall', 'siding', 'サイディング'),
      opt('wall', 'mortar', 'モルタル'),
      opt('wall', 'alc', 'ALC'),
      opt('wall', 'unknown', 'わからない'),
    ]);
  }
  return message('屋根も一緒に塗りますか。', [
    opt('roof', 'wall', '外壁だけ'),
    opt('roof', 'both', '屋根も'),
    opt('roof', 'ask', '相談して決めたい'),
  ]);
}

function goalStep(): BotMessage {
  return message('目的を選んでください。', [
    opt('goal', 'test', '定期テスト対策'),
    opt('goal', 'exam', '受験対策'),
    opt('goal', 'weak', '苦手克服'),
  ]);
}

function lightAnswer(template: NicheTemplate, flowId: string): BotMessage | null {
  if (template.id === 'painting' && flowId === 'cost') {
    const wide = paintingWideRange(template);
    return withBooking(template, [
      `${template.shop.name}の公開価格表では、戸建て外壁の目安は${wide}（税込・足場と高圧洗浄を含みます）。`,
      '建物ごとの内訳は、選択式の案内でお出しします。',
      '正確な金額は無料の現地調査で確定します。',
      NO_PUSH,
    ], template.shop.reservationLabel);
  }
  if (template.id === 'painting' && flowId === 'symptom') {
    return withBooking(template, [
      '雨漏りの応急は、バケツとタオルで水を受けるところまでです。原因の判断はこのチャットではしません。',
      'シミや色あせは急ぎの案内ではありません。気になる場合は無料の点検をご利用ください。',
    ], '点検を予約する');
  }
  if (template.id === 'painting' && flowId === 'process') {
    return withBooking(template, [
      '戸建ての塗り替えは、天候によりおおむね10〜14日が目安です。',
      '支払いは着工前と完工後の2回が基本です。保証の年数は見積書に記載します。',
    ], template.shop.reservationLabel);
  }
  if (template.id === 'juku' && flowId === 'course') return jukuPrice(template);
  if (template.id === 'juku' && flowId === 'price') return jukuPrice(template);
  if (template.id === 'juku' && flowId === 'trial') return jukuTrial(template);
  if (template.id === 'seitai' && flowId === 'area') return seitaiList(template);
  if (template.id === 'seitai' && flowId === 'price') return seitaiPrice(template);
  if (template.id === 'seitai' && flowId === 'visit') return seitaiVisit(template);
  return null;
}

function directAnswer(template: NicheTemplate, flowId: string): BotMessage | null {
  if (template.id === 'painting') {
    if (flowId === 'survey') {
      return withBooking(template, [
        'お見積りは無料です。ほかの会社と比べている段階でも構いません。',
        '見積り後に断っても大丈夫です。',
        'しつこい営業電話はしません。',
        '正確な金額には現地を見る必要があります。外壁と屋根の全体なら、30〜40分程度が目安です。',
      ], '無料の現地調査を予約する');
    }
    if (flowId === 'schedule') {
      return withBooking(template, [
        '天候により、外壁のみで10日前後、外壁と屋根で2〜3週間が目安です。',
        '雨や雪の日は、原則として塗装しません。天候で工期が延びたことだけでは、追加料金をいただかない案内が一般的です。',
        '日数は、現地調査のあとにお伝えします。',
      ], '無料の現地調査を予約する');
    }
    if (flowId === 'color') {
      return withBooking(template, [
        '塗料の種類と色は、外壁の状態とご希望を伺ってからご提案します。',
        'このチャットでは色を確定しません。見本は、現地調査のときに一緒に見られます。',
      ], '無料の現地調査を予約する');
    }
    if (flowId === 'warranty') {
      return withBooking(template, [
        '保証の年数は、塗料と工事の内容で違います。年数は見積書に書きます。',
        '施工後の点検があるかどうかも、見積りのときにご説明します。',
      ], '無料の現地調査を予約する');
    }
    if (flowId === 'living') {
      return withBooking(template, [
        '工事中は、洗濯物を外に干せないことが多いです。窓は養生のため、開けられない場合があります。',
        '駐車の置き方は、現地調査のときにご案内します。この見本店の事務所前には、来客用が2台あります。',
        '着工の前に、近隣へごあいさつに伺います。',
      ], '無料の現地調査を予約する');
    }
    if (flowId === 'book') {
      return withBooking(template, [
        '無料の現地調査は、予約ページから申し込めます。',
        NO_PUSH,
        'このチャットでは、調査の日時を確定しません。',
      ], '無料の現地調査を予約する');
    }
  }
  if (template.id === 'juku') {
    if (flowId === 'price') return jukuPrice(template);
    if (flowId === 'trial' || flowId === 'book') return jukuTrial(template);
    if (flowId === 'timetable') {
      return withBooking(template, [
        '曜日と時間は、部活や習い事と両立できるよう、体験のときに希望を伺います。',
        '教科は希望から始められ、途中の変更も相談できます。',
      ], '無料体験を予約する');
    }
    if (flowId === 'makeup') {
      return withBooking(template, [
        'この教室では、前日までのご連絡で、同じ月の空き枠へ振り替えできます。',
        '当日の欠席は、お電話ください。',
      ], '無料体験を予約する');
    }
    if (flowId === 'exam') {
      return withBooking(template, [
        '通っている学校の進度や、定期テストの範囲に合わせた学習ができます。',
        '受験に向けたコースもあります。成績や合格は保証しません。',
      ], '無料体験を予約する');
    }
  }
  if (template.id === 'seitai') {
    if (flowId === 'first') return seitaiFirst(template);
    if (flowId === 'price') return seitaiPrice(template);
    if (flowId === 'clothes') return seitaiClothes(template);
    if (flowId === 'cancel') return seitaiCancel(template);
    if (flowId === 'insurance') return seitaiInsurance(template);
    if (flowId === 'book') return seitaiVisit(template);
  }
  return null;
}

function paintResult(template: NicheTemplate, answers: Record<string, string>): BotMessage {
  const estimate = estimatePainting(template, answers);
  return withBooking(template, [estimate.text, NO_PUSH], template.shop.reservationLabel);
}

function surveyOnly(template: NicheTemplate): BotMessage {
  const estimate = estimatePainting(template, { building: 'other' });
  return withBooking(template, [estimate.text, NO_PUSH], template.shop.reservationLabel);
}

function symptomResult(template: NicheTemplate, optionId: string): BotMessage {
  if (optionId === 'leak') {
    const bot = message(
      [
        'いま雨漏りしている場合の応急です。床にバケツを置き、広がる場所へタオルを敷いてください。',
        '電気のそばまで水が来ているときは、ブレーカーを落としてください。原因の判断はこのチャットではしません。',
        '翌営業日の午前中に折り返す予約もできます。',
      ],
      [homeButton()],
    );
    bot.links = [
      { href: `tel:${template.shop.phone.replace(/-/g, '')}`, label: '今すぐ電話する' },
      { href: bookingHref(template.shop), label: '明朝の折り返しを予約する' },
    ];
    return bot;
  }
  return withBooking(
    template,
    ['急ぎの案内ではありません。気になる場合は、無料の点検をご利用ください。'],
    '点検を予約する',
  );
}

function processResult(template: NicheTemplate, optionId: string): BotMessage {
  const copy: Record<string, string> = {
    days: '戸建ての塗り替えは、天候によりおおむね10〜14日が目安です。日数は現地調査のあとにお伝えします。',
    greet: '着工の前に、近隣へごあいさつに伺います。',
    pay: 'お支払いは、着工前と完工後の2回が基本です。詳しい時期は、現地調査のときにご説明します。',
    warranty: '保証の年数は塗料によって違います。年数は見積書に記載します。',
    visit: 'この窓口は、ホームページからのご相談です。こちらから突然お宅へ伺うことはしません。',
  };
  return withBooking(template, [copy[optionId] ?? '現地調査のときにご説明します。'], template.shop.reservationLabel);
}

function jukuPrice(template: NicheTemplate): BotMessage {
  const lines = (['elementary', 'junior', 'high'] as const).map((grade) => {
    const span = jukuGradeSpan(template, grade);
    if (!span) return '';
    return `${GRADE_LABEL[grade]} ${formatYen(span.min)}〜${formatYen(span.max)}／月（税込）`;
  }).filter(Boolean);
  return message(
    [
      '授業料は、学年・週の回数・学習プランで異なります。',
      '授業料以外に、教材費がかかる場合があります。入会の可否を決める選抜テストは行いません。',
      ...lines,
    ],
    [
      { id: 'flow:course', label: '学年・教科・通う回数' },
      { id: 'flow:book', label: '無料体験を予約する' },
      homeButton(),
    ],
  );
}

function jukuTrial(template: NicheTemplate): BotMessage {
  return withBooking(
    template,
    [
      '入会を決めていなくても大丈夫です。',
      '授業の進め方を見る無料体験と、学習相談をご用意しています。所要時間は教室によります。',
      'このチャットでは体験を確定しません。',
    ],
    '無料体験を予約する',
  );
}

function courseResult(template: NicheTemplate, answers: Record<string, string>): BotMessage {
  const course = jukuCourse(template, answers.grade ?? '', answers.goal ?? '');
  if (!course) return withBooking(template, ['コースの目安は、無料体験のときにご案内します。'], '無料体験を予約する');
  const grade = GRADE_LABEL[course.grade] ?? '';
  const goal = GOAL_LABEL[course.goal] ?? '';
  return withBooking(
    template,
    [
      `${grade}の${goal}には、おすすめのコース「${course.name}」をご案内します。`,
      `月額の目安は${formatYen(course.monthlyTaxIn)}（税込）、${course.times}です。`,
      '成績や合格を保証するものではありません。',
    ],
    '無料体験を予約する',
  );
}

function seitaiList(template: NicheTemplate): BotMessage {
  const menus = template.seitai?.menus ?? [];
  const bot = message(
    ['メニューと料金の目安です。時間と金額だけをご案内します。'],
    [homeButton()],
  );
  bot.menu = menus.map((item) => ({
    name: item.name,
    priceText: formatYen(item.priceTaxIn),
    detail: `${item.minutes}分`,
  }));
  bot.links = [{ href: bookingHref(template.shop), label: '予約ページを開く' }];
  return guardSeitai(bot);
}

function areaResult(template: NicheTemplate, optionId: string): BotMessage {
  const menu = template.seitai?.menus.find((item) => item.area === optionId);
  if (!menu) return seitaiList(template);
  const bot = message(
    [`${menu.name}は${menu.minutes}分、${formatYen(menu.priceTaxIn)}（税込）です。`, '感じ方には個人差があります。このチャットでは、時間と料金だけをご案内します。'],
    [homeButton()],
  );
  bot.links = [{ href: bookingHref(template.shop), label: '予約ページを開く' }];
  return guardSeitai(bot);
}

function seitaiFirst(template: NicheTemplate): BotMessage {
  return withBooking(template, [
    'ご予約のあと、初回は10分ほど早めにお越しください。問診票を書いていただきます。',
    '更衣室で動きやすい服装に着替え、お話を伺ってから施術し、最後にお会計です。',
    '医療機関ではありません。感じ方には個人差があります。',
  ], '予約ページを開く');
}

function seitaiClothes(template: NicheTemplate): BotMessage {
  return withBooking(template, [
    '動きやすい薄手の服装が案内しやすいです。',
    '更衣室と、貸し出しがあります。普段の服装のままで来て、着替えてから施術できます。',
  ], '予約ページを開く');
}

function seitaiCancel(template: NicheTemplate): BotMessage {
  return withBooking(template, [
    '現金と、主なクレジットカードが使えます。',
    'この院では、前日までのご連絡ならキャンセル料をいただきません。当日はお電話ください。',
    '予約の確定は予約ページで行います。このチャットでは確定しません。',
  ], '予約ページを開く');
}

function seitaiInsurance(template: NicheTemplate): BotMessage {
  return withBooking(template, [
    '医療機関ではなく整体のため、医療保険の対象外です。',
    '健康保険証は不要です。全額自費になります。',
  ], '予約ページを開く');
}

function seitaiPrice(template: NicheTemplate): BotMessage {
  const first = template.seitai?.firstVisit;
  const bot = message(
    [
      first ? `${first.name}は${first.minutes}分、${formatYen(first.priceTaxIn)}（税込）です。` : '初回料金は予約ページに記載しています。',
      '通う間隔は、ご希望を伺ったうえでご相談ください。このチャットでは回数を決めません。',
      '医療機関ではありません。感じ方には個人差があります。',
    ],
    [{ id: 'flow:area', label: '気になる箇所からコースを見る' }, homeButton()],
  );
  bot.links = [{ href: bookingHref(template.shop), label: '予約ページを開く' }];
  return guardSeitai(bot);
}

function seitaiVisit(template: NicheTemplate): BotMessage {
  const shop = template.shop;
  const bot = message(
    [
      `営業時間：${shop.hours}`,
      `定休日：${shop.closedDays}`,
      shop.extra.lastBooking ?? '',
      '空きは予約ページでご確認ください。このチャットでは空きを確定しません。',
      '医療機関ではありません。',
      `電話：${shop.phone}`,
    ].filter(Boolean),
    [homeButton()],
  );
  bot.links = [
    { href: bookingHref(shop), label: '予約ページを開く' },
    { href: `tel:${shop.phone.replace(/-/g, '')}`, label: '電話する' },
  ];
  return guardSeitai(bot);
}

function withBooking(template: NicheTemplate, paragraphs: string[], label: string): BotMessage {
  const bot = message(paragraphs, [homeButton()]);
  bot.links = [{ href: bookingHref(template.shop), label }];
  if (template.id === 'seitai') return guardSeitai(bot);
  return bot;
}

function backHome(template: NicheTemplate): BotMessage {
  return message('ご用件を選んでください。', templateHomeButtons('standard', template.shop, true));
}

function bookingHref(shop: Shop): string {
  return shop.reservationUrl || `/reserve/${shop.slug}`;
}

function message(paragraphs: string | string[], buttons: ChatButton[]): BotMessage {
  return {
    paragraphs: Array.isArray(paragraphs) ? paragraphs : [paragraphs],
    buttons,
    links: [],
    menu: [],
    form: false,
  };
}

function opt(step: string, id: string, label: string): ChatButton {
  return { id: `opt:${step}:${id}`, label };
}

function homeButton(): ChatButton {
  return { id: 'back:home', label: '最初の画面に戻る' };
}

function optionLabel(flowId: string, stepId: string, optionId: string): string {
  const tables: Record<string, string> = {
    house2: '戸建て2階',
    house3: '戸建て3階',
    other: 'アパート・その他',
    s25: '〜25坪',
    s35: '26〜35坪',
    s45: '36〜45坪',
    s46: '46坪〜',
    unknown: 'わからない',
    siding: 'サイディング',
    mortar: 'モルタル',
    alc: 'ALC',
    wall: '外壁だけ',
    both: '屋根も',
    ask: '相談して決めたい',
    leak: 'いま雨漏りしている',
    crack: 'シミ・ひび割れ',
    fade: '色あせ・触ると白い粉がつく',
    when: '塗り替えの時期か知りたい',
    days: '工事期間',
    greet: '近所へのあいさつ',
    pay: '支払い',
    warranty: '保証',
    visit: '訪問営業との違い',
    elementary: '小学生',
    junior: '中学生',
    high: '高校生',
    test: '定期テスト対策',
    exam: '受験対策',
    weak: '苦手克服',
    neck: '首・肩まわり',
    waist: '腰まわり',
    posture: '姿勢・疲労ケア',
  };
  return tables[optionId] ?? tables[stepId] ?? flowId;
}

function guardSeitai(bot: BotMessage): BotMessage {
  const blob = [...bot.paragraphs, ...bot.menu.map((item) => `${item.name} ${item.detail}`)].join('\n');
  if (containsEfficacyClaim(blob)) {
    throw new Error('seitai guide contains an efficacy claim');
  }
  return bot;
}

