import type { Catalog, Faq, HandoffInput, Industry, MenuItem, PlanId, Shop } from '../types';
import { INDUSTRY_LABEL, PLAN_LABEL, containsEfficacyClaim } from '../types';
import { validateHandoff, type HandoffDraft } from './handoff';
import { interpret, matchFaq, menuCategory, type Intent } from './match';

export interface ChatButton {
  id: string;
  label: string;
}

export interface ChatLink {
  href: string;
  label: string;
}

export interface MenuLine {
  name: string;
  priceText: string;
  detail: string;
}

export interface BotMessage {
  paragraphs: string[];
  buttons: ChatButton[];
  links: ChatLink[];
  menu: MenuLine[];
  form: boolean;
}

export interface ChatState {
  plan: PlanId;
  industry: Industry | null;
  mode: 'industry' | 'chat' | 'handoff-form';
  locked: boolean;
}

export interface Turn {
  state: ChatState;
  userText?: string;
  bot: BotMessage;
  effect?: { type: 'insert-handoff'; input: HandoffInput };
}

export type ChatEvent =
  | { type: 'pick'; industry: Industry }
  | { type: 'button'; id: string; label?: string }
  | { type: 'text'; text: string }
  | { type: 'handoff'; draft: HandoffDraft };

const LIGHT_RICH = new Set<Intent['kind']>(['hours', 'access', 'recommend', 'crowd']);

export const DEMO_DISCLAIMER = 'デモのため返信しません。実在の個人情報は入力しないでください。';

export function reservePath(shop: Shop): string {
  return `/reserve/${shop.slug}`;
}

const CONFIRMED_RESERVATION = /予約しました|確定しました|承りました|お取りしました|予約を確定しました/;

export function emptyBot(paragraphs: string[], buttons: ChatButton[] = []): BotMessage {
  return { paragraphs, buttons, links: [], menu: [], form: false };
}

export function start(plan: PlanId): { state: ChatState; bot: BotMessage } {
  return {
    state: { plan, industry: null, mode: 'industry', locked: false },
    bot: emptyBot(
      [`${PLAN_LABEL[plan]}プランのデモです。業種を選んでください。`],
      industryButtons(),
    ),
  };
}

const INDUSTRY_PICK_ORDER: Industry[] = ['salon', 'seitai', 'food'];

export function industryButtons(): ChatButton[] {
  return INDUSTRY_PICK_ORDER.map((industry) => ({
    id: `industry:${industry}`,
    label: INDUSTRY_LABEL[industry],
  }));
}

export function startLocked(plan: PlanId, shop: Shop, faqs: Faq[]): { state: ChatState; bot: BotMessage } {
  const intro =
    plan === 'light'
      ? 'ご質問を入力してください。下のよくある質問からも選べます。'
      : 'ご用件を選ぶか、そのまま質問を入力してください。';
  return {
    state: { plan, industry: shop.industry, mode: 'chat', locked: true },
    bot: emptyBot([intro], homeButtons(plan, shop.industry, faqs, true)),
  };
}

export function homeButtons(plan: PlanId, industry: Industry, faqs: Faq[], locked = false): ChatButton[] {
  const reset = locked ? [] : [{ id: 'industry:reset', label: '業種を選び直す' }];
  if (plan === 'light') {
    return [
      { id: 'section:reserve', label: '予約したい' },
      ...faqs
        .filter((faq) => faq.published)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((faq) => ({ id: `faq:${faq.id}`, label: faq.question })),
      ...reset,
    ];
  }
  const main: ChatButton[] =
    industry === 'food'
      ? [
          { id: 'section:menu', label: 'メニューを見る' },
          { id: 'section:reserve', label: '予約したい' },
          { id: 'section:hours', label: '営業時間・定休日' },
          { id: 'section:access', label: 'アクセス・駐車場' },
          { id: 'section:faq', label: 'よくある質問' },
        ]
      : industry === 'salon'
        ? [
            { id: 'section:menu', label: 'メニュー・料金' },
            { id: 'section:reserve', label: '予約したい' },
            { id: 'section:hours', label: '営業時間・定休日' },
            { id: 'section:access', label: 'アクセス' },
            { id: 'section:faq', label: 'よくある質問' },
          ]
        : [
            { id: 'section:first', label: '初めての方へ' },
            { id: 'section:menu', label: 'メニュー・料金' },
            { id: 'section:reserve', label: '予約したい' },
            { id: 'section:hours-access', label: '営業時間・アクセス' },
            { id: 'section:faq', label: 'よくある質問' },
          ];
  const staff = plan === 'full' ? [{ id: 'handoff:ask', label: 'スタッフに聞く' }] : [];
  return [...main, ...staff, ...reset];
}

export function apply(state: ChatState, event: ChatEvent, catalog: Catalog): Turn {
  if (event.type === 'pick' || (event.type === 'button' && event.id.startsWith('industry:'))) {
    const industry = (event.type === 'pick' ? event.industry : event.id.slice('industry:'.length)) as Industry | 'reset';
    if (state.locked && state.industry) {
      const shop = catalog.shops.find((item) => item.industry === state.industry && item.published);
      if (shop) {
        const faqs = catalog.faqs.filter((faq) => faq.shopId === shop.id);
        const opened = startLocked(state.plan, shop, faqs);
        return { state: opened.state, userText: '最初の画面に戻る', bot: opened.bot };
      }
    }
    if (industry === 'reset') {
      const opened = start(state.plan);
      return { state: opened.state, userText: '業種を選び直す', bot: opened.bot };
    }
    return pickIndustry(state.plan, industry, catalog);
  }

  const shop = catalog.shops.find((item) => item.industry === state.industry && item.published);
  if (!shop || !state.industry) {
    const opened = start(state.plan);
    return { state: opened.state, bot: emptyBot(['先に業種を選んでください。'], opened.bot.buttons) };
  }
  const faqs = catalog.faqs
    .filter((faq) => faq.shopId === shop.id)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const menu = catalog.menu
    .filter((item) => item.shopId === shop.id)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (event.type === 'text') {
    return answerText(state, shop, faqs, menu, event.text);
  }
  if (event.type === 'handoff') {
    return submitHandoff(state, shop, event.draft);
  }
  return answerButton(state, shop, faqs, menu, event.id, event.type === 'button' ? event.label : undefined);
}

function pickIndustry(plan: PlanId, industry: Industry, catalog: Catalog): Turn {
  const shop = catalog.shops.find((item) => item.industry === industry && item.published);
  if (!shop) {
    return {
      state: { plan, industry: null, mode: 'industry', locked: false },
      userText: INDUSTRY_LABEL[industry],
      bot: emptyBot(['この業種のお店データが見つかりません。seed.sql を確認してください。'], industryButtons()),
    };
  }
  const faqs = catalog.faqs.filter((faq) => faq.shopId === shop.id && faq.published);
  const intro =
    plan === 'light'
      ? 'ご質問を入力してください。下のよくある質問からも選べます。'
      : 'ご用件を選ぶか、そのまま質問を入力してください。';
  return {
    state: { plan, industry, mode: 'chat', locked: false },
    userText: INDUSTRY_LABEL[industry],
    bot: emptyBot([`ここから${INDUSTRY_LABEL[industry]}のご案内です。`, `${shop.name}です。`, intro], homeButtons(plan, industry, faqs)),
  };
}

function answerButton(state: ChatState, shop: Shop, faqs: Faq[], menu: MenuItem[], id: string, label?: string): Turn {
  const next = { ...state, mode: 'chat' as const };
  if (id === 'section:reserve') {
    return { state: next, userText: '予約したい', bot: reservationMessage(state.plan, shop) };
  }
  if (id === 'section:hours') {
    return { state: next, userText: '営業時間・定休日', bot: hoursMessage(shop, false) };
  }
  if (id === 'section:access') {
    return { state: next, userText: shop.industry === 'salon' ? 'アクセス' : 'アクセス・駐車場', bot: accessMessage(shop) };
  }
  if (id === 'section:hours-access') {
    return { state: next, userText: '営業時間・アクセス', bot: hoursAndAccess(shop) };
  }
  if (id === 'section:first') {
    return { state: next, userText: '初めての方へ', bot: firstVisitMessage(shop) };
  }
  if (id === 'section:menu') {
    return { state: next, userText: shop.industry === 'food' ? 'メニューを見る' : 'メニュー・料金', bot: menuRoot(shop, menu) };
  }
  if (id === 'section:faq' || id === 'back:faq') {
    return { state: next, userText: 'よくある質問', bot: faqList(state.plan, faqs) };
  }
  if (id === 'back:home') {
    return { state: next, userText: '最初の画面に戻る', bot: homeAgain(state.plan, shop, faqs, state.locked) };
  }
  if (id.startsWith('menu-cat:')) {
    const category = id.slice('menu-cat:'.length);
    return { state: next, userText: categoryLabel(category), bot: menuList(shop, menu, category) };
  }
  if (id.startsWith('faq:')) {
    const faq = faqs.find((item) => item.id === id.slice(4) && item.published);
    if (!faq) {
      return {
        state: next,
        userText: label && label !== '質問' ? label : '選んだ質問',
        bot: emptyBot(
          ['業種を切り替えたため、この質問は使えません。下のボタンから選び直してください。'],
          homeButtons(state.plan, shop.industry, faqs, state.locked),
        ),
      };
    }
    return { state: next, userText: faq.question, bot: faqMessage(state.plan, shop, faq) };
  }
  if (id === 'handoff:ask') {
    return {
      state: next,
      userText: 'スタッフに聞く',
      bot: state.plan === 'full' && shop.plan === 'full' ? handoffAsk() : contactMessage(shop),
    };
  }
  if (id === 'handoff:yes' && state.plan === 'full' && shop.plan === 'full') {
    return {
      state: { ...state, mode: 'handoff-form' },
      userText: 'スタッフに質問を送る',
      bot: {
        paragraphs: ['スタッフからお返事するため、以下をご記入ください。', DEMO_DISCLAIMER],
        buttons: [],
        links: [],
        menu: [],
        form: true,
      },
    };
  }
  if (id === 'handoff:no') {
    return { state: next, userText: '送らずに最初の画面に戻る', bot: homeAgain(state.plan, shop, faqs, state.locked) };
  }
  return { state: next, bot: homeAgain(state.plan, shop, faqs, state.locked) };
}

function answerText(state: ChatState, shop: Shop, faqs: Faq[], menu: MenuItem[], text: string): Turn {
  const trimmed = text.trim();
  const next = { ...state, mode: 'chat' as const };
  if (!trimmed) {
    return { state: next, bot: emptyBot(['ご質問を入力してください。'], homeButtons(state.plan, shop.industry, faqs, state.locked)) };
  }
  let intent = interpret(trimmed, shop.industry, faqs);
  if (state.plan === 'light' && intent.kind === 'menu') {
    return {
      state: next,
      userText: trimmed,
      bot: emptyBot(['メニューと料金は、お店のホームページでご確認ください。'], homeButtons(state.plan, shop.industry, faqs, state.locked)),
    };
  }
  if (state.plan === 'light' && LIGHT_RICH.has(intent.kind)) {
    const faq = matchFaq(trimmed, faqs);
    intent = faq ? { kind: 'faq', faq } : { kind: 'unknown' };
  }
  return { state: next, userText: trimmed, bot: messageForIntent(state.plan, shop, faqs, menu, intent, trimmed, state.locked) };
}

function messageForIntent(
  plan: PlanId,
  shop: Shop,
  faqs: Faq[],
  menu: MenuItem[],
  intent: Intent,
  query: string,
  locked = false,
): BotMessage {
  switch (intent.kind) {
    case 'empty':
      return emptyBot(['すみません、うまく読み取れませんでした。下のボタンから選ぶか、ことばで質問してください。'], homeButtons(plan, shop.industry, faqs, locked));
    case 'greeting':
      return emptyBot(['こんにちは。下のボタンか、質問の入力でご案内します。'], homeButtons(plan, shop.industry, faqs, locked));
    case 'medical':
      return medicalMessage(plan, shop);
    case 'staff':
    case 'complaint':
      return plan === 'full' && shop.plan === 'full' ? handoffAsk() : contactMessage(shop);
    case 'cross':
      return emptyBot(
        [`申し訳ありません。こちらは${shop.name}のご案内です。`, '下のボタンから、当店についてお調べいただけます。'],
        homeButtons(plan, shop.industry, faqs, locked),
      );
    case 'reserve-change':
      return reserveChangeMessage(plan, shop);
    case 'reserve':
      return reservationMessage(plan, shop);
    case 'crowd':
      return crowdMessage(shop);
    case 'hours':
      return hoursMessage(shop, false);
    case 'access':
      return accessMessage(shop);
    case 'menu': {
      const category = menuCategory(shop.industry, query);
      if (category) return menuList(shop, menu, category);
      return menuRoot(shop, menu);
    }
    case 'recommend':
      return recommendMessage(shop, menu);
    case 'offtopic':
      return unknownMessage(plan, shop);
    case 'faq':
      return faqMessage(plan, shop, intent.faq);
    case 'unknown':
      return unknownMessage(plan, shop);
    default:
      return unknownMessage(plan, shop);
  }
}

function submitHandoff(state: ChatState, shop: Shop, draft: HandoffDraft): Turn {
  if (state.plan !== 'full' || shop.plan !== 'full') {
    return { state: { ...state, mode: 'chat' }, bot: contactMessage(shop) };
  }
  const validated = validateHandoff(shop.id, draft);
  if (!validated.ok) {
    return {
      state: { ...state, mode: 'handoff-form' },
      bot: {
        paragraphs: [validated.message],
        buttons: [{ id: 'handoff:no', label: '送らずに最初の画面に戻る' }],
        links: [],
        menu: [],
        form: true,
      },
    };
  }
  return {
    state: { ...state, mode: 'chat' },
    bot: emptyBot(
      ['送信しました。お問い合わせありがとうございます。', DEMO_DISCLAIMER],
      [{ id: 'back:home', label: '最初の画面に戻る' }],
    ),
    effect: { type: 'insert-handoff', input: validated.value },
  };
}

function reserveChangeMessage(plan: PlanId, shop: Shop): BotMessage {
  const staff = plan === 'full' && shop.plan === 'full';
  const message = emptyBot(
    staff
      ? ['ご予約の変更は、予約ページからお手続きください。ページ上でわからないときは、スタッフにも聞けます。', '（デモでは見本ページが開きます）']
      : [
          'ご予約の変更は、予約ページからお手続きください。',
          'ページ上でわからないときは、お電話かメールでお問い合わせください。',
          `電話：${shop.phone}`,
          `メール：${shop.email}`,
          '（デモでは見本ページが開きます）',
        ],
    staff
      ? [
          { id: 'handoff:ask', label: 'スタッフに聞く' },
          { id: 'back:home', label: '最初の画面に戻る' },
        ]
      : [backButton(plan)],
  );
  message.links = [{ href: reservePath(shop), label: '予約ページを開く' }];
  if (!staff) {
    message.links.push(
      { href: `tel:${shop.phone.replace(/-/g, '')}`, label: '電話する' },
      { href: `mailto:${shop.email}`, label: 'メールする' },
    );
  }
  assertNoFalseConfirmation(message);
  return message;
}

export function reservationMessage(plan: PlanId, shop: Shop): BotMessage {
  const message = emptyBot(
    [
      'ご予約は、下のネット予約のページから承っています。',
      '空き状況の確認や、日時・人数のご指定も予約ページでできます。',
      '（デモでは見本ページが開きます）',
    ],
    [backButton(plan)],
  );
  message.links = [{ href: reservePath(shop), label: 'ネット予約のページを開く' }];
  assertNoFalseConfirmation(message);
  return message;
}

function hoursMessage(shop: Shop, withAccess: boolean): BotMessage {
  const lines = [`営業時間：${shop.hours}`, `定休日：${shop.closedDays}`];
  if (shop.extra.lunchHours) lines.push(shop.extra.lunchHours);
  if (shop.extra.lastOrder) lines.push(shop.extra.lastOrder);
  if (shop.extra.lastCut) lines.push(shop.extra.lastCut);
  if (shop.extra.lastColor) lines.push(shop.extra.lastColor);
  if (shop.extra.lastBooking) lines.push(shop.extra.lastBooking);
  if (shop.extra.seats) lines.push(shop.extra.seats);
  if (shop.extra.staff) lines.push(shop.extra.staff);
  const message = emptyBot(lines, [{ id: 'back:home', label: '最初の画面に戻る' }]);
  if (withAccess) {
    message.paragraphs.push(`住所：${shop.address}`, shop.accessText, shop.parking);
    message.links.push({ href: shop.mapUrl, label: '地図を開く' });
  }
  return message;
}

function hoursAndAccess(shop: Shop): BotMessage {
  return hoursMessage(shop, true);
}

function accessMessage(shop: Shop): BotMessage {
  return {
    paragraphs: [`住所：${shop.address}`, shop.accessText, `駐車場：${shop.parking}`],
    buttons: [{ id: 'back:home', label: '最初の画面に戻る' }],
    links: [{ href: shop.mapUrl, label: '地図を開く' }],
    menu: [],
    form: false,
  };
}

function firstVisitMessage(shop: Shop): BotMessage {
  const message = emptyBot(
    [
      'はじめての方へのご案内です。',
      '①ご予約：下のボタンからご予約ください。',
      '②当日：動きやすい服装でお越しください。お着替えもご用意しています。',
      '③カウンセリング：お体の気になるところや、ご希望を伺います。',
      '初回料金：カウンセリング＋整体（60分）5,500円',
    ],
    [{ id: 'back:home', label: '最初の画面に戻る' }],
  );
  message.links = [{ href: reservePath(shop), label: 'ネット予約のページを開く' }];
  return message;
}

function menuRoot(shop: Shop, menu: MenuItem[]): BotMessage {
  if (shop.industry === 'seitai') return menuList(shop, menu, 'course');
  const categories =
    shop.industry === 'food'
      ? [
          { id: 'menu-cat:lunch', label: 'ランチ' },
          { id: 'menu-cat:cafe', label: 'カフェ' },
          { id: 'menu-cat:takeout', label: 'テイクアウト' },
        ]
      : [
          { id: 'menu-cat:cut', label: 'カット' },
          { id: 'menu-cat:color', label: 'カラー' },
          { id: 'menu-cat:perm', label: 'パーマ' },
          { id: 'menu-cat:other', label: 'その他' },
        ];
  return emptyBot(['見たい種類を選んでください。'], [...categories, { id: 'back:home', label: '最初の画面に戻る' }]);
}

function menuList(shop: Shop, menu: MenuItem[], category: string): BotMessage {
  const rows = menu.filter((item) => item.category === category);
  const message = emptyBot(
    rows.length ? [`${categoryLabel(category)}のご案内です。価格は税込です。`] : ['該当するメニューがありません。'],
    [{ id: 'back:home', label: '最初の画面に戻る' }],
  );
  message.menu = rows.map((item) => ({
    name: safeSeitaiCopy(shop, item.name),
    priceText: item.priceText,
    detail: safeSeitaiCopy(shop, item.detail),
  }));
  return message;
}

function recommendMessage(shop: Shop, menu: MenuItem[]): BotMessage {
  const sample = (shop.industry === 'seitai' ? menu.filter((item) => item.name.startsWith('初回')) : menu).slice(0, 3);
  const lead =
    shop.industry === 'seitai'
      ? '初めての方には初回のメニューをご案内しています。合うかどうかは来院時にご相談ください。'
      : '一例です。お好みや人数はスタッフへご相談ください。';
  const message = emptyBot([safeSeitaiCopy(shop, lead)], [{ id: 'back:home', label: '最初の画面に戻る' }]);
  message.menu = sample.map((item) => ({
    name: safeSeitaiCopy(shop, item.name),
    priceText: item.priceText,
    detail: safeSeitaiCopy(shop, item.detail),
  }));
  return message;
}

function crowdMessage(shop: Shop): BotMessage {
  const message = emptyBot(
    ['いまの混雑や空きは、このチャットではわかりません。', '予約ページで空きをご確認ください。'],
    [{ id: 'back:home', label: '最初の画面に戻る' }],
  );
  message.links = [{ href: reservePath(shop), label: 'ネット予約のページを開く' }];
  assertNoFalseConfirmation(message);
  return message;
}

function faqList(plan: PlanId, faqs: Faq[]): BotMessage {
  return emptyBot(
    ['質問を選んでください。'],
    [
      ...faqs.filter((faq) => faq.published).map((faq) => ({ id: `faq:${faq.id}`, label: faq.question })),
      backButton(plan),
    ],
  );
}

function faqMessage(plan: PlanId, shop: Shop, faq: Faq): BotMessage {
  const message = emptyBot([safeSeitaiCopy(shop, faq.answer)], [backButton(plan)]);
  const aboutReserve = faq.keywords.includes('予約') || faq.question.includes('予約');
  if (aboutReserve) message.links = [{ href: reservePath(shop), label: 'ネット予約のページを開く' }];
  return message;
}

function medicalMessage(plan: PlanId, shop: Shop): BotMessage {
  const message = emptyBot(
    [
      '症状の見込みや、施術でどうなるかは、このチャットではお答えできません。',
      '来院時のカウンセリングで施術者にご相談ください。',
    ],
    [backButton(plan)],
  );
  message.links.push({ href: reservePath(shop), label: 'ネット予約のページを開く' });
  message.paragraphs.push(`お電話でもご相談いただけます。${shop.phone}`);
  for (const paragraph of message.paragraphs) {
    if (containsEfficacyClaim(paragraph)) {
      throw new Error('medical reply contains an efficacy claim');
    }
  }
  return message;
}

function contactMessage(shop: Shop): BotMessage {
  return {
    paragraphs: [
      '申し訳ありません。このご質問には、チャットではお答えできませんでした。',
      'お手数ですが、お電話かメールでお問い合わせください。',
      `電話：${shop.phone}`,
      `メール：${shop.email}`,
    ],
    buttons: [{ id: 'back:home', label: '最初の画面に戻る' }],
    links: [
      { href: `tel:${shop.phone.replace(/-/g, '')}`, label: '電話する' },
      { href: `mailto:${shop.email}`, label: 'メールする' },
    ],
    menu: [],
    form: false,
  };
}

function unknownMessage(plan: PlanId, shop: Shop): BotMessage {
  if (plan === 'full' && shop.plan === 'full') return handoffAsk();
  return contactMessage(shop);
}

function handoffAsk(): BotMessage {
  return emptyBot(
    ['チャットでお答えできない内容は、スタッフにメッセージを送れます。お店からあとでご連絡します。'],
    [
      { id: 'handoff:yes', label: 'スタッフに質問を送る' },
      { id: 'handoff:no', label: '最初の画面に戻る' },
    ],
  );
}

function homeAgain(plan: PlanId, shop: Shop, faqs: Faq[], locked = false): BotMessage {
  const intro = plan === 'light' ? 'ご質問を入力してください。' : 'ご用件を選んでください。';
  return emptyBot([intro], homeButtons(plan, shop.industry, faqs, locked));
}

function backButton(_plan: PlanId): ChatButton {
  return { id: 'back:home', label: '最初の画面に戻る' };
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    lunch: 'ランチ',
    cafe: 'カフェ',
    takeout: 'テイクアウト',
    cut: 'カット',
    color: 'カラー',
    perm: 'パーマ',
    other: 'その他',
    course: 'メニュー',
  };
  return labels[category] ?? 'メニュー';
}

function safeSeitaiCopy(shop: Shop, text: string): string {
  if (shop.industry !== 'seitai' || !containsEfficacyClaim(text)) return text;
  return '症状の見込みはこのチャットではお答えできません。来院時のカウンセリングで施術者にご相談ください。';
}

function assertNoFalseConfirmation(message: BotMessage): void {
  const blob = message.paragraphs.join('\n');
  if (CONFIRMED_RESERVATION.test(blob)) {
    throw new Error('reservation reply confirmed a booking');
  }
}

export function plainText(message: BotMessage): string {
  return [...message.paragraphs, ...message.menu.map((item) => `${item.name} ${item.priceText} ${item.detail}`), ...message.links.map((link) => link.href)].join('\n');
}
