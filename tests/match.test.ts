import { describe, expect, it } from 'vitest';
import { demoFaqs, demoShops } from '../src/data/demo-seed';
import { interpret, matchFaq } from '../src/lib/match';
import type { Industry } from '../src/types';

function faqs(industry: Industry) {
  const shop = demoShops.find((item) => item.industry === industry)!;
  return demoFaqs.filter((faq) => faq.shopId === shop.id);
}

describe('matchFaq', () => {
  it('matches colloquial and mistyped parking questions', () => {
    const hit = matchFaq('ちゅうしゃじょうある？', faqs('food'));
    expect(hit?.question).toBe('駐車場はありますか？');
  });

  it('matches 子供 to the child FAQ', () => {
    const hit = matchFaq('子供連れでも大丈夫？', faqs('food'));
    expect(hit?.question).toBe('子ども連れでも利用できますか？');
  });

  it('does not invent a FAQ for wifi or pets', () => {
    expect(matchFaq('Wi-Fiはありますか？', faqs('food'))).toBeNull();
    expect(matchFaq('ペット連れでも大丈夫？', faqs('food'))).toBeNull();
  });

  it('keeps cancellation fee and cancellation contact apart', () => {
    expect(matchFaq('キャンセル料はかかりますか？', faqs('seitai'))?.question).toBe('キャンセル料はかかりますか？');
    expect(matchFaq('キャンセルの連絡は？', faqs('salon'))?.question).toBe('キャンセルの連絡は？');
  });
});

describe('interpret', () => {
  it('classifies the unexpected questions from the spec', () => {
    expect(interpret('Wi-Fiはありますか？', 'food', faqs('food')).kind).toBe('unknown');
    expect(interpret('ペット連れでも大丈夫？', 'salon', faqs('salon')).kind).toBe('unknown');
    expect(interpret('明日の15時で予約しておいて', 'food', faqs('food')).kind).toBe('reserve');
    expect(interpret('カットはいくら？', 'food', faqs('food')).kind).toBe('cross');
    expect(interpret('カットはいくら？', 'salon', faqs('salon')).kind).toBe('menu');
    expect(interpret('おすすめは？', 'food', faqs('food')).kind).toBe('recommend');
    expect(interpret('混んでる？', 'salon', faqs('salon')).kind).toBe('crowd');
    expect(interpret('腰のヘルニアは治りますか？', 'seitai', faqs('seitai')).kind).toBe('medical');
    expect(interpret('😊', 'food', faqs('food')).kind).toBe('empty');
    expect(interpret('hello', 'salon', faqs('salon')).kind).toBe('greeting');
    expect(interpret('do you have parking?', 'food', faqs('food')).kind).toBe('faq');
    expect(interpret('値引きして', 'food', faqs('food')).kind).toBe('complaint');
    expect(interpret('今日の天気は？', 'food', faqs('food')).kind).toBe('offtopic');
    expect(interpret('how much is a haircut', 'salon', faqs('salon')).kind).toBe('menu');
    expect(interpret('how much is a haircut', 'food', faqs('food')).kind).toBe('cross');
  });
});
