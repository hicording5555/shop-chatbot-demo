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
  it('starts the painting demo on the real FAQ menu and quotes a published range', () => {
    const opened = open('standard', 'painting');
    expect(opened.bot.buttons.map((button) => button.label).slice(0, 7)).toEqual([
      '費用の目安を知る',
      '無料の現地調査について',
      '工期・雨の日の対応',
      '塗料・色選びの相談',
      '保証・アフターフォロー',
      '工事中の生活（洗濯物・駐車・近隣挨拶）',
      '無料の現地調査を予約する',
    ]);
    const quoted = click('standard', 'painting', ['費用の目安を知る', '戸建て2階', '26〜35坪', 'サイディング', '外壁だけ']);
    expect(quoted.text).toContain('78万〜108万円');
    expect(quoted.text).toContain('あおば塗装（架空）の公開価格表');
    expect(quoted.text).toContain('しつこい営業電話はしません');
    expect(quoted.text).toContain('/reserve/aoba');
    expect(quoted.text).toContain('無料の現地調査を予約する');
  });

  it('keeps the light plan on a prepared answer and adds handoff only on full', () => {
    const light = click('light', 'painting', ['費用の目安を知る']);
    const survey = click('standard', 'painting', ['無料の現地調査について']);
    expect(survey.text).toContain('お見積りは無料です');
    expect(survey.text).toContain('見積り後に断っても大丈夫です');
    expect(survey.text).toContain('しつこい営業電話はしません');
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
    expect(opened.bot.buttons.map((button) => button.label).slice(0, 7)).toEqual([
      '授業料・費用について',
      '無料体験・学習相談について',
      '学年・教科・通う回数',
      '時間割・部活や習い事との両立',
      '振替（欠席したとき）',
      '定期テスト・受験対策',
      '無料体験を予約する',
    ]);
    const course = click('standard', 'juku', ['学年・教科・通う回数', '中学生', '定期テスト対策']);
    expect(course.text).toContain('中学生・定期テストコース');
    expect(course.text).toContain('16,500円');
    expect(course.text).toContain('無料体験を予約する');
    expect(course.text).toContain('/reserve/midori');
    expect(course.text).not.toContain('成績保証');
    const trial = click('standard', 'juku', ['無料体験・学習相談について']);
    expect(trial.text).toContain('入会を決めていなくても大丈夫です');
    expect(trial.text).toContain('このチャットでは体験を確定しません');
  });

  it('guides a seitai visitor without efficacy claims', () => {
    const opened = open('standard', 'seitai');
    expect(opened.bot.buttons.map((button) => button.label).slice(0, 7)).toEqual([
      '初めての方へ（当日の流れ）',
      '料金・所要時間',
      '服装・着替え',
      '予約・キャンセル・支払い',
      '保険は使えますか？',
      '気になる箇所からコースを見る',
      'ご予約・空き確認',
    ]);
    const area = click('standard', 'seitai', ['気になる箇所からコースを見る', '腰まわり']);
    expect(area.text).toContain('腰まわりのコース');
    expect(area.text).toContain('40分');
    expect(area.text).toContain('4,400円');
    expect(area.text).toContain('/reserve/nozomi');
    expect(containsEfficacyClaim(area.text)).toBe(false);
    const price = click('standard', 'seitai', ['料金・所要時間']);
    const insurance = click('standard', 'seitai', ['保険は使えますか？']);
    expect(insurance.text).toContain('医療機関ではなく整体のため、医療保険の対象外です');
    expect(price.text).toContain('6,600円');
    expect(price.text).toContain('回数を決めません');
    expect(containsEfficacyClaim(price.text)).toBe(false);
    const visit = click('standard', 'seitai', ['ご予約・空き確認']);
    expect(visit.text).toContain('10:00〜20:00');
    expect(visit.text).toContain('このチャットでは空きを確定しません');
    const survey = click('standard', 'painting', ['無料の現地調査について']);
    const living = click('standard', 'painting', ['工事中の生活（洗濯物・駐車・近隣挨拶）']);
    const blob = [area.text, price.text, visit.text, insurance.text, survey.text, living.text].join('\n');
    for (const phrase of banned) expect(blob).not.toContain(phrase);
    expect(blob).not.toContain('放置すると');
  });
});
