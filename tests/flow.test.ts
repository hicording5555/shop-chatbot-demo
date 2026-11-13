import { describe, expect, it } from 'vitest';
import { demoFaqs, demoMenu, demoShops } from '../src/data/demo-seed';
import { apply, plainText, start, startLocked, type ChatEvent } from '../src/lib/flow';
import { splitKeywords } from '../src/lib/keywords';
import { findSecretFindings } from '../src/lib/secrets';
import { containsEfficacyClaim, type Catalog, type PlanId } from '../src/types';

const catalog: Catalog = { shops: demoShops, faqs: demoFaqs, menu: demoMenu };
const confirmed = /予約しました|確定しました|承りました|お取りしました/;

function run(plan: PlanId, industry: 'food' | 'salon' | 'seitai', event: ChatEvent) {
  const opened = apply(start(plan).state, { type: 'pick', industry }, catalog);
  return apply(opened.state, event, catalog);
}

describe('plan flows', () => {
  it('starts by asking for an industry on every plan', () => {
    for (const plan of ['light', 'standard', 'full'] as PlanId[]) {
      const opened = start(plan);
      expect(opened.state.industry).toBeNull();
      expect(opened.bot.buttons.map((button) => button.label)).toEqual(['美容室・サロン', '整体院', '飲食店・カフェ']);
    }
  });

  it('shows FAQ buttons on light and menu buttons on standard', () => {
    const light = apply(start('light').state, { type: 'pick', industry: 'food' }, catalog);
    expect(light.bot.buttons.map((button) => button.label)).toContain('駐車場はありますか？');
    expect(light.bot.buttons.map((button) => button.label)).toContain('予約したい');
    expect(light.bot.buttons.map((button) => button.label)).not.toContain('メニューを見る');

    const standard = apply(start('standard').state, { type: 'pick', industry: 'food' }, catalog);
    expect(standard.bot.buttons.map((button) => button.label)).toEqual([
      'メニューを見る',
      '予約したい',
      '営業時間・定休日',
      'アクセス・駐車場',
      'よくある質問',
      '業種を選び直す',
    ]);

    const seitai = apply(start('full').state, { type: 'pick', industry: 'seitai' }, catalog);
    expect(seitai.bot.buttons.map((button) => button.label)).toContain('初めての方へ');
    expect(seitai.bot.buttons.map((button) => button.label)).toContain('営業時間・アクセス');
    expect(seitai.bot.buttons.map((button) => button.label)).toContain('スタッフに聞く');
  });

  it('never confirms a reservation and links to the shop page on standard', () => {
    const typed = run('standard', 'food', { type: 'text', text: '明日の15時で予約しておいて' });
    const text = plainText(typed.bot);
    expect(text).toContain('ネット予約');
    expect(text).toContain('/reserve/komorebi');
    expect(text).not.toMatch(confirmed);
    expect(typed.effect).toBeUndefined();

    const clicked = run('full', 'salon', { type: 'button', id: 'section:reserve' });
    expect(plainText(clicked.bot)).toContain('/reserve/lumiere');
    expect(plainText(clicked.bot)).not.toMatch(confirmed);
  });

  it('offers the same reservation page on the light plan', () => {
    const turn = run('light', 'food', { type: 'text', text: '明日の15時で予約しておいて' });
    expect(plainText(turn.bot)).toContain('/reserve/komorebi');
    expect(plainText(turn.bot)).not.toMatch(confirmed);
  });

  it('locks a shop to its menu and staff button', () => {
    const shop = demoShops.find((item) => item.industry === 'salon');
    if (!shop) throw new Error('missing salon');
    const opened = startLocked(
      'full',
      shop,
      demoFaqs.filter((faq) => faq.shopId === shop.id),
    );
    expect(opened.state.locked).toBe(true);
    expect(opened.bot.paragraphs).toEqual(['ご用件を選ぶか、そのまま質問を入力してください。']);
    expect(opened.bot.buttons.map((button) => button.label)).toContain('メニュー・料金');
    expect(opened.bot.buttons.map((button) => button.label)).toContain('スタッフに聞く');
    expect(opened.bot.buttons.map((button) => button.label)).not.toContain('業種を選び直す');
    expect(start('full').state.locked).toBe(false);
  });

  it('routes staff talk and reservation changes before the FAQ', () => {
    const staff = run('full', 'salon', { type: 'text', text: '担当者と話したい' });
    expect(staff.bot.paragraphs.join('')).toContain('スタッフにメッセージを送れます');
    expect(staff.bot.paragraphs.join('')).not.toContain('担当者を選べます');

    const change = run('full', 'salon', { type: 'text', text: '予約を変更したい' });
    expect(plainText(change.bot)).toContain('/reserve/lumiere');
    expect(change.bot.buttons.map((button) => button.label)).toContain('スタッフに聞く');
    expect(change.bot.paragraphs.join('')).toContain('ご予約の変更は、予約ページからお手続きください');

    const cancel = run('full', 'salon', { type: 'text', text: 'キャンセルしたい' });
    expect(plainText(cancel.bot)).toContain('/reserve/lumiere');
    expect(cancel.bot.buttons.map((button) => button.label)).toContain('スタッフに聞く');
    expect(cancel.bot.paragraphs.join('')).not.toContain('チャットではお答えできませんでした');

    const consult = run('full', 'salon', { type: 'text', text: '担当者に相談したい' });
    expect(consult.bot.paragraphs.join('')).toContain('スタッフにメッセージを送れます');
    expect(consult.bot.paragraphs.join('')).not.toContain('担当者を選べます');
  });

  it('sends unknown questions to contact info, or to handoff on the full plan', () => {
    const light = run('light', 'food', { type: 'text', text: 'Wi-Fiはありますか？' });
    expect(plainText(light.bot)).toContain('チャットではお答えできませんでした');
    expect(light.bot.paragraphs.join('')).toContain('03-0000-1100');

    const full = run('full', 'food', { type: 'text', text: 'ペット連れでも大丈夫？' });
    expect(full.bot.paragraphs.join('')).toContain('スタッフにメッセージを送れます');
    expect(full.bot.buttons.map((button) => button.label)).toEqual(['スタッフに質問を送る', '最初の画面に戻る']);

    const bargain = run('standard', 'salon', { type: 'text', text: '値引きして' });
    expect(plainText(bargain.bot)).toContain('お電話かメールでお問い合わせください');
    const bargainFull = run('full', 'salon', { type: 'text', text: 'クレームです' });
    expect(bargainFull.bot.buttons.map((button) => button.label)).toContain('スタッフに質問を送る');
  });

  it('returns jokes to the menu and gives a non-committal seitai reply', () => {
    const joke = run('full', 'food', { type: 'text', text: '今日の天気は？' });
    expect(joke.bot.form).toBe(false);
    expect(joke.bot.buttons.map((button) => button.label)).toContain('スタッフに質問を送る');
    expect(joke.bot.paragraphs.join('')).toContain('スタッフにメッセージを送れます');

    const medical = run('light', 'seitai', { type: 'text', text: '腰のヘルニアは治りますか？' });
    const text = plainText(medical.bot);
    expect(text).toContain('お答えできません');
    expect(text).toContain('ご相談ください');
    expect(containsEfficacyClaim(text)).toBe(false);
  });

  it('saves a handoff only after a valid form on the full plan', () => {
    const opened = apply(start('full').state, { type: 'pick', industry: 'seitai' }, catalog);
    const asked = apply(opened.state, { type: 'button', id: 'handoff:yes' }, catalog);
    expect(asked.state.mode).toBe('handoff-form');
    expect(asked.bot.form).toBe(true);

    const invalid = apply(asked.state, { type: 'handoff', draft: { name: '', contact: 'x', question: '' } }, catalog);
    expect(invalid.effect).toBeUndefined();
    expect(invalid.state.mode).toBe('handoff-form');

    const saved = apply(
      asked.state,
      { type: 'handoff', draft: { name: '木村', contact: '０９０-1234-5678', question: '腰痛は治りますか？' } },
      catalog,
    );
    expect(saved.effect?.input.contact).toBe('090-1234-5678');
    expect(saved.effect?.input.shopId).toBe(demoShops.find((shop) => shop.industry === 'seitai')?.id);
    expect(plainText(saved.bot)).toContain('送信しました');
    expect(plainText(saved.bot)).toContain('デモのため返信しません');
    expect(plainText(saved.bot)).not.toContain('営業日以内');
    expect(containsEfficacyClaim(plainText(saved.bot))).toBe(false);
  });

  it('tells the visitor to pick again when an old shop button is used', () => {
    const food = apply(start('standard').state, { type: 'pick', industry: 'food' }, catalog);
    const faq = catalog.faqs.find((item) => item.question === 'テイクアウトはできますか？');
    const salon = apply(food.state, { type: 'pick', industry: 'salon' }, catalog);
    const stale = apply(salon.state, { type: 'button', id: `faq:${faq?.id}`, label: 'テイクアウトはできますか？' }, catalog);
    expect(stale.userText).toBe('テイクアウトはできますか？');
    expect(plainText(stale.bot)).toContain('業種を切り替えたため');
  });
});

describe('keywords and secret scan', () => {
  it('splits Japanese commas', () => {
    expect(splitKeywords('ちゅうしゃじょう、車，パーキング')).toEqual(['ちゅうしゃじょう', '車', 'パーキング']);
  });

  it('flags sb_secret keys and service role JWTs', () => {
    const header = btoa(JSON.stringify({ alg: 'none' }));
    const body = btoa(JSON.stringify({ role: 'service_role' }));
    const token = `${header}.${body}.sig`;
    expect(findSecretFindings(`prefix ${'sb_' + 'secret_live'} suffix`)).toContain('supabase secret api key');
    expect(findSecretFindings(token)).toContain('service_role jwt');
    expect(findSecretFindings('anon key only')).toEqual([]);
  });
});
