import type { Faq, Industry } from '../types';
import { diceCoefficient, normalize, squash } from './normalize';

function hits(re: RegExp, raw: string): boolean {
  return re.test(squash(raw)) || re.test(normalize(raw));
}

export type Intent =
  | { kind: 'empty' }
  | { kind: 'greeting' }
  | { kind: 'medical' }
  | { kind: 'complaint' }
  | { kind: 'cross' }
  | { kind: 'staff' }
  | { kind: 'reserve-change' }
  | { kind: 'reserve' }
  | { kind: 'crowd' }
  | { kind: 'hours' }
  | { kind: 'access' }
  | { kind: 'menu' }
  | { kind: 'recommend' }
  | { kind: 'offtopic' }
  | { kind: 'faq'; faq: Faq }
  | { kind: 'unknown' };

const CONCEPTS: { id: string; re: RegExp }[] = [
  { id: 'parking', re: /駐車場|parking/ },
  { id: 'reserve', re: /予約|reserve|reservation|booking/ },
  { id: 'hours', re: /営業時間|営業は|定休|開店|閉店|何時まで|hours|opening/ },
  { id: 'access', re: /アクセス|住所|道順|地図|行き方|access|address/ },
  { id: 'child', re: /子ども|子連れ|キッズ|小学生/ },
  { id: 'takeout', re: /テイクアウト|ていくあうと|弁当|持ち帰り/ },
  { id: 'allergy', re: /アレルギー|アレルゲン/ },
  { id: 'pay', re: /支払|カード|現金|qr/ },
  { id: 'private', re: /貸切/ },
  { id: 'duration', re: /どれくらい|どのくらい|何分|所要|時間かかる/ },
  { id: 'nominate', re: /指名|担当/ },
  { id: 'cancel', re: /キャンセル|きゃんせる|取消/ },
  { id: 'insurance', re: /保険/ },
  { id: 'frequency', re: /頻度|間隔|週1|通院/ },
  { id: 'pain', re: /痛い|ボキボキ/ },
  { id: 'first', re: /初めて|持ち物|服装|持っていけ/ },
  { id: 'wifi', re: /wifi|無線lan/ },
  { id: 'pet', re: /ペット|ぺっと|犬|猫/ },
];

const MEDICAL_RE = /ヘルニア|へるにあ|ぎっくり|診断|病気|完治|医療|医者|病院|治る|治り|治して|治し|改善|効く|効き|しびれ|腰痛|頭痛/;
const COMPLAINT_RE = /クレーム|苦情|最悪|返金|ひどい|ふざけ|ぼったくり|文句/;
const NEGOTIATE_RE = /値引|まけて|安くして|割引して/;
const RESERVE_RE = /予約|reserve|reservation|booking/;
const RESERVE_CHANGE_RE = /変更|キャンセル|取消/;
const CANCEL_RE = /キャンセル|きゃんせる|取消/;
const STAFF_RE = /スタッフ|人と話|電話したい|電話で|担当者と話|担当者に相談|担当者に話|スタッフに相談|直接聞|オペレーター|問い合わせ|誰かいます|話を聞きたい|メールしたい/;
const CROWD_RE = /混んで|混雑|混み具合|空いてる|空いてます|空き状況|空きある/;
const HOURS_RE = /営業時間|営業は|定休|開店|閉店|何時まで|hours|opening|open/;
const ACCESS_RE = /アクセス|住所|道順|地図|行き方|access|address/;
const PARKING_RE = /駐車場|parking/;
const MENU_RE = /メニュー|めにゅう|menu/;
const PRICE_RE = /料金|値段|いくら|価格|price|howmuch/;
const RECOMMEND_RE = /おすすめ|人気/;
const OFFTOPIC_RE = /天気|占い|ジョーク|冗談|大統領|恋愛|株価|遊び|ww+/;
const GREETING_RE = /^(こんにちは|こんばんは|おはよう|おはようございます|やあ|hello|hi|hey|はじめまして)$/;

const FOREIGN: Record<Industry, RegExp> = {
  food: /カット|かっと|haircut|パーマ|ぱーま|ヘアカラー|へあからー|整体|骨盤|施術|ヘルニア|へるにあ/,
  salon: /ランチ|らんち|ナポリタン|なぽりたん|テイクアウト|ていくあうと|弁当|整体|骨盤|ヘルニア|へるにあ|施術/,
  seitai: /ランチ|らんち|ナポリタン|なぽりたん|テイクアウト|ていくあうと|弁当|カット|かっと|haircut|パーマ|ぱーま|ヘアカラー|へあからー/,
};

function conceptSet(text: string): Set<string> {
  const found = new Set<string>();
  for (const concept of CONCEPTS) {
    if (hits(concept.re, text)) found.add(concept.id);
  }
  return found;
}

export function matchFaq(query: string, faqs: Faq[]): Faq | null {
  const qNorm = normalize(query);
  if (!qNorm) return null;
  const qConcepts = conceptSet(query);
  let best: { faq: Faq; score: number } | null = null;
  for (const faq of faqs) {
    if (!faq.published) continue;
    const hay = `${faq.question} ${faq.keywords.join(' ')}`;
    const fConcepts = conceptSet(hay);
    let overlap = 0;
    for (const concept of qConcepts) {
      if (fConcepts.has(concept)) overlap += 1;
    }
    const similarity = diceCoefficient(qNorm, normalize(hay));
    if (overlap === 0 && (similarity < 0.82 || qNorm.length < 4)) continue;
    const score = overlap * 10 + similarity;
    if (!best || score > best.score) best = { faq, score };
  }
  return best?.faq ?? null;
}

export function interpret(query: string, industry: Industry, faqs: Faq[]): Intent {
  const n = normalize(query);
  if (!n) return { kind: 'empty' };
  if (GREETING_RE.test(n)) return { kind: 'greeting' };
  if (industry === 'seitai' && hits(MEDICAL_RE, query)) return { kind: 'medical' };
  if (hits(STAFF_RE, query)) return { kind: 'staff' };
  if (hits(COMPLAINT_RE, query) || hits(NEGOTIATE_RE, query)) return { kind: 'complaint' };
  if (hits(FOREIGN[industry], query)) return { kind: 'cross' };
  if (hits(CANCEL_RE, query) || (hits(RESERVE_RE, query) && hits(RESERVE_CHANGE_RE, query))) return { kind: 'reserve-change' };
  if (hits(RESERVE_RE, query)) return { kind: 'reserve' };
  if (hits(CROWD_RE, query)) return { kind: 'crowd' };
  if (hits(HOURS_RE, query)) return { kind: 'hours' };
  if (hits(ACCESS_RE, query) && !hits(PARKING_RE, query)) return { kind: 'access' };
  if (hits(PARKING_RE, query)) {
    const parkingFaq = matchFaq(query, faqs);
    if (parkingFaq) return { kind: 'faq', faq: parkingFaq };
  }
  if (hits(MENU_RE, query) || hits(PRICE_RE, query)) return { kind: 'menu' };
  if (hits(RECOMMEND_RE, query)) return { kind: 'recommend' };
  if (hits(OFFTOPIC_RE, query)) return { kind: 'offtopic' };
  const faq = matchFaq(query, faqs);
  if (faq) return { kind: 'faq', faq };
  return { kind: 'unknown' };
}

export function menuCategory(industry: Industry, query: string): string | undefined {
  if (industry === 'food') {
    if (hits(/弁当|テイクアウト|ていくあうと|持ち帰り/, query)) return 'takeout';
    if (hits(/ランチ|らんち/, query)) return 'lunch';
    if (hits(/コーヒー|こーひー|ケーキ|けーき|ナポリタン|なぽりたん|カフェ|かふぇ/, query)) return 'cafe';
  }
  if (industry === 'salon') {
    if (hits(/前髪/, query)) return 'cut';
    if (hits(/パーマ|ぱーま/, query)) return 'perm';
    if (hits(/カラー|からー/, query)) return 'color';
    if (hits(/トリートメント|とりーとめんと/, query)) return 'other';
    if (hits(/カット|かっと|haircut|子ども/, query)) return 'cut';
  }
  if (industry === 'seitai') return 'course';
  return undefined;
}
