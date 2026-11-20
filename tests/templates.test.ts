import { describe, expect, it } from 'vitest';
import { templateByNiche, templateCatalog, estimatePainting, type NicheTemplate, type PaintPriceRow } from '../src/data/templates';
import { apply, plainText, startLocked } from '../src/lib/flow';
import { containsEfficacyClaim, type PlanId } from '../src/types';

const catalog = templateCatalog();
const banned = ['放置すると危険', '今日なら割引', '今だけ', '一番お得', '他社より安い', '治る', '改善します', '効果抜群', '効果がある', '成績保証', '合格率'];

function shop(id: 'painting' | 'juku' | 'seitai') {
  return templateByNiche(id).shop;
}

function open(plan: PlanId, id: 'painting' | 'juku' | 'seitai') {
  const current = shop(id);
  return startLocked(plan, current, catalog.faqs.filter((faq) => faq.shopId === current.id));
}

function click(plan: PlanId, id: 'painting' | 'juku' | 'seitai', labels: string[]) {
  const opened = open(plan, id);
  let state = opened.state;
  let buttons = opened.bot.buttons;
  let text = plainText(opened.bot);
  for (const label of labels) {
    const match = buttons.find((item) => item.label === label);
    if (!match) throw new Error(`missing button ${label}`);
    const turn = apply(state, { type: 'button', id: match.id, label }, catalog);
    state = turn.state;
    buttons = turn.bot.buttons;
    text = `${plainText(turn.bot)}\n${turn.bot.links.map((link) => link.label).join('\n')}`;
  }
  return { state, text };
}

describe('niche templates', () => {
  it('starts the painting demo on the three chips and quotes a published range', () => {
    const opened = open('standard', 'painting');
    expect(opened.bot.buttons.map((button) => button.label).slice(0, 3)).toEqual([
      'だいたいの費用を知りたい',
      '雨漏り・ひび割れが気になる',
      '工事の流れ・期間・支払いを知りたい',
    ]);
    const quoted = click('standard', 'painting', ['だいたいの費用を知りたい', '戸建て2階', '26〜35坪', 'サイディング', '外壁だけ']);
    expect(quoted.text).toContain('78万〜108万円');
    expect(quoted.text).toContain('あおば塗装（架空）の公開価格表');
    expect(quoted.text).toContain('しつこい営業電話はしません');
    expect(quoted.text).toContain('/reserve/aoba');
    expect(quoted.text).toContain('無料の現地調査を予約する');
  });

  it('keeps the light plan on a prepared answer and adds handoff only on full', () => {
    const light = click('light', 'painting', ['だいたいの費用を知りたい']);
    expect(light.text).toContain('68万〜198万円');
    expect(light.text).not.toContain('戸建て2階');
    expect(open('light', 'painting').bot.buttons.map((button) => button.label)).not.toContain('スタッフに聞く');
    expect(open('standard', 'painting').bot.buttons.map((button) => button.label)).not.toContain('スタッフに聞く');
    expect(open('full', 'painting').bot.buttons.map((button) => button.label)).toContain('スタッフに聞く');
    const handed = apply(open('full', 'painting').state, { type: 'button', id: 'handoff:ask' }, catalog);
    expect(plainText(handed.bot)).toContain('スタッフにメッセージを送れます');
  });

  it('reads a swapped price table instead of a fixed sentence', () => {
    const sample = templateByNiche('painting');
    const customRows: PaintPriceRow[] = [
      { building: 'house2', size: 's35', wallMin: 1110000, wallMax: 1220000, bothMin: 1330000, bothMax: 1440000 },
    ];
    const custom: NicheTemplate = {
      ...sample,
      shop: { ...sample.shop, name: '差し替え塗装（架空）' },
      painting: { rows: customRows, alcExtra: 0 },
    };
    const estimate = estimatePainting(custom, { building: 'house2', size: 's35', wall: 'siding', roof: 'wall' });
    expect(estimate.text).toContain('差し替え塗装（架空）');
    expect(estimate.text).toContain('111万〜122万円');
    expect(estimate.text).not.toContain('78万');
  });

  it('guides a juku visitor to a course and a trial page', () => {
    const opened = open('standard', 'juku');
    expect(opened.bot.buttons.map((button) => button.label).slice(0, 3)).toEqual([
      '学年・目的に合うコースを知りたい',
      '料金・授業料の目安は？',
      '無料体験を申し込みたい',
    ]);
    const course = click('standard', 'juku', ['学年・目的に合うコースを知りたい', '中学生', '定期テスト対策']);
    expect(course.text).toContain('中学生・定期テストコース');
    expect(course.text).toContain('16,500円');
    expect(course.text).toContain('無料体験を予約する');
    expect(course.text).toContain('/reserve/midori');
    expect(course.text).not.toContain('成績保証');
    const trial = click('standard', 'juku', ['無料体験を申し込みたい']);
    expect(trial.text).toContain('このチャットでは体験を確定しません');
  });

  it('guides a seitai visitor without efficacy claims', () => {
    const opened = open('standard', 'seitai');
    expect(opened.bot.buttons.map((button) => button.label).slice(0, 3)).toEqual([
      'つらい場所からメニューを選びたい',
      '初回料金・通い方の目安は？',
      '予約方法・営業時間を知りたい',
    ]);
    const area = click('standard', 'seitai', ['つらい場所からメニューを選びたい', '腰まわり']);
    expect(area.text).toContain('腰まわりのコース');
    expect(area.text).toContain('40分');
    expect(area.text).toContain('4,400円');
    expect(area.text).toContain('/reserve/nozomi');
    expect(containsEfficacyClaim(area.text)).toBe(false);
    const price = click('standard', 'seitai', ['初回料金・通い方の目安は？']);
    expect(price.text).toContain('6,600円');
    expect(price.text).toContain('回数を決めません');
    expect(containsEfficacyClaim(price.text)).toBe(false);
    const visit = click('standard', 'seitai', ['予約方法・営業時間を知りたい']);
    expect(visit.text).toContain('10:00〜20:00');
    expect(visit.text).toContain('このチャットでは確定しません');
    const symptom = click('standard', 'painting', ['雨漏り・ひび割れが気になる', 'シミ・ひび割れ']);
    const leak = click('standard', 'painting', ['雨漏り・ひび割れが気になる', 'いま雨漏りしている']);
    const blob = [opened.bot, area.text, price.text, visit.text, symptom.text, leak.text].join('\n');
    for (const phrase of banned) expect(blob).not.toContain(phrase);
    expect(blob).not.toContain('放置すると');
  });
});
