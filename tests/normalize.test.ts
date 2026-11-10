import { describe, expect, it } from 'vitest';
import { diceCoefficient, normalize } from '../src/lib/normalize';

describe('normalize', () => {
  it('folds kana, width, punctuation, and emoji', () => {
    expect(normalize('  Ｗｉ－Ｆｉ！！😊  ')).toBe('wifi');
    expect(normalize('パーキング')).toBe('駐車場');
    expect(normalize('ちゅうしゃじょうある？')).toBe('駐車場ある');
    expect(normalize('子供連れ')).toBe('子ども連れ');
  });

  it('treats emoji-only input as empty', () => {
    expect(normalize('😊😊')).toBe('');
  });

  it('scores shared bigrams', () => {
    expect(diceCoefficient('支払い方法', '支払い方法は')).toBeGreaterThan(0.6);
    expect(diceCoefficient('天気', '駐車場')).toBeLessThan(0.4);
  });
});
