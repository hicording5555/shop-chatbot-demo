/** 空白と記号を落としただけ。カタカナは残す。 */
export function squash(raw: string): string {
  return raw.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function foldKana(value: string): string {
  return value.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** 検索用の正規化。表示文には使わない。 */
export function normalize(raw: string): string {
  let s = foldKana(squash(raw));
  s = s.replace(/駐者場|駐車上|ちゅうしゃじょう|ちゅうしゃじょ/g, '駐車場');
  s = s.replace(/えいぎょうじかん|営業じかん/g, '営業時間');
  s = s.replace(/よやく/g, '予約');
  s = s.replace(/子供/g, '子ども');
  s = s.replace(/こども/g, '子ども');
  s = s.replace(/わいふぁい/g, 'wifi');
  s = s.replace(/めにゅー|めにゅう/g, 'メニュー');
  s = s.replace(/ぱーきんぐ/g, '駐車場');
  return s;
}

export function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const counts = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i += 1) {
    const bg = a.slice(i, i + 2);
    counts.set(bg, (counts.get(bg) ?? 0) + 1);
  }
  let overlap = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const bg = b.slice(i, i + 2);
    const n = counts.get(bg) ?? 0;
    if (n > 0) {
      counts.set(bg, n - 1);
      overlap += 1;
    }
  }
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}
