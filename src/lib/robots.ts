/** 検索に出さないパス。店専用デモの将来URLは /shop-demo 配下に置く。 */
export const NOINDEX_PREFIXES = ['/admin', '/widget', '/reserve', '/shop-demo'] as const;

export function shouldNoindex(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
