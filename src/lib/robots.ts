/** 検索に出してよいパス。これ以外（管理、埋め込み、予約見本、未知のURL）は noindex。 */
const PUBLIC_EXACT = new Set(['/', '/plans', '/flow', '/faq', '/consult', '/apply', '/privacy', '/legal', '/terms']);

export function isPublicPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (PUBLIC_EXACT.has(path)) return true;
  return /^\/demo\/(light|standard|full)$/.test(path);
}

/** 未設定のあいだは公開しない。`1` または `true` のときだけ、公開パスを検索対象にする。 */
export function allowsIndex(value?: string): boolean {
  const flag = (value ?? import.meta.env.VITE_ALLOW_INDEX ?? '').trim();
  return flag === '1' || flag === 'true';
}

export function shouldNoindex(pathname: string, allowIndex = allowsIndex()): boolean {
  if (!allowIndex) return true;
  return !isPublicPath(pathname);
}
