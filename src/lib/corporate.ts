/**
 * コーポレートサイトのベース。本番の独自ドメインは【未定】。
 * VITE_CORPORATE_BASE_URL があればそちらを使い、無ければ仮URLに戻す。
 * 仮URLはページ内に散らさず、ここだけに置く。
 */
const PROVISIONAL_CORPORATE_BASE = 'https://iw-digital-corporate-261110.jovial-ridge-4916.chatgpt.site';

export function corporateBase(configured?: string): string {
  const value = (configured ?? import.meta.env.VITE_CORPORATE_BASE_URL ?? '').trim().replace(/\/+$/, '');
  return value || PROVISIONAL_CORPORATE_BASE;
}

export function corporateHome(configured?: string): string {
  return `${corporateBase(configured)}/`;
}

export function corporateAiChatbot(configured?: string): string {
  return `${corporateBase(configured)}/services/ai-solutions`;
}
