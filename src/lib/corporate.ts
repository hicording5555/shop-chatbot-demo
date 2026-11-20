/**
 * コーポレートサイトのベース。
 * VITE_CORPORATE_BASE_URL があればそちらを使い、無ければ https://arktechlab.com に戻す。
 * ベースURLはページ内に散らさず、ここだけに置く。
 */
const DEFAULT_CORPORATE_BASE = 'https://arktechlab.com';

export function corporateBase(configured?: string): string {
  const value = (configured ?? import.meta.env.VITE_CORPORATE_BASE_URL ?? '').trim().replace(/\/+$/, '');
  return value || DEFAULT_CORPORATE_BASE;
}

export function corporateHome(configured?: string): string {
  return `${corporateBase(configured)}/`;
}

export function corporateAiChatbot(configured?: string): string {
  return `${corporateBase(configured)}/services/ai-solutions`;
}
