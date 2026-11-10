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
}

export interface Turn {
  state: ChatState;
  userText?: string;
  bot: BotMessage;
  effect?: { type: 'insert-handoff'; input: HandoffInput };
}

export type ChatEvent =
  | { type: 'pick'; industry: Industry }
  | { type: 'button'; id: string }
  | { type: 'text'; text: string }
  | { type: 'handoff'; draft: HandoffDraft };

const LIGHT_RICH = new Set<Intent['kind']>(['reserve', 'hours', 'access', 'menu', 'recommend', 'crowd']);

const CONFIRMED_RESERVATION = /予約しました|確定しました|承りました|お取りしました|予約を確定しました/;

export function emptyBot(paragraphs: string[], buttons: ChatButton[] = []): BotMessage {
  return { paragraphs, buttons, links: [], menu: [], form: false };
}

export function start(plan: PlanId): { state: ChatState; bot: BotMessage } {
  return {
    state: { plan, industry: null, mode: 'industry' },
    bot: emptyBot(
      [`${PLAN_LABEL[plan]}プランのデモです。業種を選んでください。`],
      industryButtons(),
    ),
  };
}

export function industryButtons(): ChatButton[] {
  return (Object.keys(INDUSTRY_LABEL) as Industry[]).map((industry) => ({
    id: `industry:${industry}`,
    label: INDUSTRY_LABEL[industry],
  }));
}

export function homeButtons(plan: PlanId, industry: Industry, faqs: Faq[]): ChatButton[] {
  if (plan === 'light') {
    return [
      ...faqs
        .filter((faq) => faq.published)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((faq) => ({ id: `faq:${faq.id}`, label: faq.question })),
      { id: 'industry:reset', label: '業種を選び直す' },
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
  return [...main, { id: 'industry:reset', label: '業種を選び直す' }];
}

export function apply(state: ChatState, event: ChatEvent, catalog: Catalog): Turn {
  if (event.type === 'pick' || (event.type === 'button' && event.id.startsWith('industry:'))) {
    const industry = (event.type === 'pick' ? event.industry : event.id.slice('industry:'.length)) as Industry | 'reset';
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
  return answerButton(state, shop, faqs, menu, event.id);
}

function pickIndustry(plan: PlanId, industry: Industry, catalog: Catalog): Turn {
  const shop = catalog.shops.find((item) => item.industry === industry && item.published);
  if (!shop) {
    return {
      state: { plan, industry: null, mode: 'industry' },
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
    state: { plan, industry, mode: 'chat' },
    userText: INDUSTRY_LABEL[industry],
    bot: emptyBot([`${shop.name}のご案内です。`, intro], homeButtons(plan, industry, faqs)),
  };
}

function answerButton(state: ChatState, shop: Shop, faqs: Faq[], menu: MenuItem[], id: string): Turn {
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
    return { state: next, userText: 'メニューに戻る', bot: homeAgain(state.plan, shop, faqs) };
  }
  if (id.startsWith('menu-cat:')) {
    const category = id.slice('menu-cat:'.length);
    return { state: next, userText: categoryLabel(category), bot: menuList(shop, menu, category) };
  }
  if (id.startsWith('faq:')) {
    const faq = faqs.find((item) => item.id === id.slice(4) && item.published);
    if (!faq) {
      return { state: next, userText: '質問', bot: unknownMessage(state.plan, shop) };
    }
    return { state: next, userText: faq.question, bot: faqMessage(state.plan, shop, faq) };
  }
  if (id === 'handoff:yes' && state.plan === 'full') {
    return {
      state: { ...state, mode: 'handoff-form' },
      userText: 'はい',
      bot: {
        paragraphs: ['お名前、連絡先（メールまたは電話）、質問内容を入力してください。'],
        buttons: [{ id: 'handoff:no', label: 'いいえ（メニューに戻る）' }],
        links: [],
        menu: [],
        form: true,
      },
    };
  }
  if (id === 'handoff:no') {
    return { state: next, userText: 'いいえ（メニューに戻る）', bot: homeAgain(state.plan, shop, faqs) };
  }
  return { state: next, bot: homeAgain(state.plan, shop, faqs) };
}

function answerText(state: ChatState, shop: Shop, faqs: Faq[], menu: MenuItem[], text: string): Turn {
  const trimmed = text.trim();
  const next = { ...state, mode: 'chat' as const };
  if (!trimmed) {
    return { state: next, bot: emptyBot(['ご質問を入力してください。'], homeButtons(state.plan, shop.industry, faqs)) };
  }
  let intent = interpret(trimmed, shop.industry, faqs);
  if (state.plan === 'light' && LIGHT_RICH.has(intent.kind)) {
    const faq = matchFaq(trimmed, faqs);
    intent = faq ? { kind: 'faq', faq } : { kind: 'unknown' };
  }
  return { state: next, userText: trimmed, bot: messageForIntent(state.plan, shop, faqs, menu, intent, trimmed) };
}

function messageForIntent(
  plan: PlanId,
  shop: Shop,
  faqs: Faq[],
  menu: MenuItem[],
  intent: Intent,
  query: string,
): BotMessage {
  switch (intent.kind) {
    case 'empty':
      return emptyBot(['文章が読み取れませんでした。ボタンを選ぶか、質問を入力してください。'], homeButtons(plan, shop.industry, faqs));
    case 'greeting':
      return emptyBot(['こんにちは。下のボタンか、質問の入力でご案内します。'], homeButtons(plan, shop.industry, faqs));
    case 'medical':
      return medicalMessage(plan, shop);
    case 'complaint':
      return plan === 'full' ? handoffAsk() : contactMessage(shop, 'その内容はこちらではお受けできません。お店に直接お問い合わせください。');
    case 'cross':
      return emptyBot(
        [`こちらは${shop.name}（${INDUSTRY_LABEL[shop.industry]}）です。`, '別の業種のご質問にはお答えできません。下のボタンからご案内します。'],
        homeButtons(plan, shop.industry, faqs),
      );
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
      return emptyBot(['その話題にはお答えできません。お店のご案内に戻ります。'], homeButtons(plan, shop.industry, faqs));
    case 'faq':
      return faqMessage(plan, shop, intent.faq);
    case 'unknown':
      return unknownMessage(plan, shop);
    default:
      return unknownMessage(plan, shop);
  }
}

function submitHandoff(state: ChatState, shop: Shop, draft: HandoffDraft): Turn {
  if (state.plan !== 'full') {
    return { state: { ...state, mode: 'chat' }, bot: contactMessage(shop, 'お店に直接お問い合わせください。') };
  }
  const validated = validateHandoff(shop.id, draft);
  if (!validated.ok) {
    return {
      state: { ...state, mode: 'handoff-form' },
      bot: {
        paragraphs: [validated.message],
        buttons: [{ id: 'handoff:no', label: 'いいえ（メニューに戻る）' }],
        links: [],
        menu: [],
        form: true,
      },
    };
  }
  return {
    state: { ...state, mode: 'chat' },
    bot: emptyBot(
      ['受け付けました。', `スタッフから${shop.handoffBusinessDays}営業日以内にご連絡します。`],
      [{ id: 'back:home', label: 'メニューに戻る' }],
    ),
    effect: { type: 'insert-handoff', input: validated.value },
  };
}

export function reservationMessage(plan: PlanId, shop: Shop): BotMessage {
  const message = emptyBot(
    [
      'このチャットでは予約を確定しません。',
      '人数や日時の指定もここでは受け付けていません。下の予約ページからお手続きください。',
    ],
    [backButton(plan)],
  );
  message.links = [{ href: shop.reservationUrl, label: shop.reservationLabel }];
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
  const message = emptyBot(lines, [{ id: 'back:home', label: 'メニューに戻る' }]);
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
    buttons: [{ id: 'back:home', label: 'メニューに戻る' }],
    links: [{ href: shop.mapUrl, label: '地図を開く' }],
    menu: [],
    form: false,
  };
}

function firstVisitMessage(shop: Shop): BotMessage {
  const text = shop.extra.firstVisit ?? '動きやすい服装でお越しください。';
  return emptyBot([safeSeitaiCopy(shop, text)], [{ id: 'back:home', label: 'メニューに戻る' }]);
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
  return emptyBot(['見たい種類を選んでください。'], [...categories, { id: 'back:home', label: 'メニューに戻る' }]);
}

function menuList(shop: Shop, menu: MenuItem[], category: string): BotMessage {
  const rows = menu.filter((item) => item.category === category);
  const message = emptyBot(
    rows.length ? [`${categoryLabel(category)}のご案内です。価格は税込です。`] : ['該当するメニューがありません。'],
    [{ id: 'back:home', label: 'メニューに戻る' }],
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
  const message = emptyBot([safeSeitaiCopy(shop, lead)], [{ id: 'back:home', label: 'メニューに戻る' }]);
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
    [{ id: 'back:home', label: 'メニューに戻る' }],
  );
  message.links = [{ href: shop.reservationUrl, label: shop.reservationLabel }];
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
  return emptyBot([safeSeitaiCopy(shop, faq.answer)], [backButton(plan)]);
}

function medicalMessage(plan: PlanId, shop: Shop): BotMessage {
  const message = emptyBot(
    [
      '症状の見込みや、施術でどうなるかは、このチャットではお答えできません。',
      '来院時のカウンセリングで施術者にご相談ください。',
    ],
    [backButton(plan)],
  );
  if (plan === 'light') {
    message.paragraphs.push('お店に直接お問い合わせください。', `電話：${shop.phone}`);
  } else {
    message.links.push({ href: shop.reservationUrl, label: shop.reservationLabel });
  }
  for (const paragraph of message.paragraphs) {
    if (containsEfficacyClaim(paragraph)) {
      throw new Error('medical reply contains an efficacy claim');
    }
  }
  return message;
}

function contactMessage(shop: Shop, lead: string): BotMessage {
  return {
    paragraphs: [lead, `電話：${shop.phone}`, `メール：${shop.email}`, `住所：${shop.address}`],
    buttons: [{ id: 'back:home', label: 'メニューに戻る' }],
    links: [
      { href: `tel:${shop.phone.replace(/-/g, '')}`, label: '電話する' },
      { href: `mailto:${shop.email}`, label: 'メールする' },
    ],
    menu: [],
    form: false,
  };
}

function unknownMessage(plan: PlanId, shop: Shop): BotMessage {
  if (plan === 'full') return handoffAsk();
  return contactMessage(shop, 'お店に直接お問い合わせください。');
}

function handoffAsk(): BotMessage {
  return emptyBot(['この質問には、用意しているご案内ではお答えできません。', 'スタッフにおつなぎしますか？'], [
    { id: 'handoff:yes', label: 'はい' },
    { id: 'handoff:no', label: 'いいえ（メニューに戻る）' },
  ]);
}

function homeAgain(plan: PlanId, shop: Shop, faqs: Faq[]): BotMessage {
  const intro = plan === 'light' ? 'ご質問を入力してください。' : 'ご用件を選んでください。';
  return emptyBot([intro], homeButtons(plan, shop.industry, faqs));
}

function backButton(plan: PlanId): ChatButton {
  if (plan === 'light') return { id: 'back:home', label: '質問一覧へ戻る' };
  return { id: 'back:home', label: 'メニューに戻る' };
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
