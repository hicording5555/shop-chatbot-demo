export type Industry = 'food' | 'salon' | 'seitai';
export type PlanId = 'light' | 'standard' | 'full';

export interface ShopExtra {
  seats?: string;
  lunchHours?: string;
  lastOrder?: string;
  lastCut?: string;
  lastColor?: string;
  staff?: string;
  lastBooking?: string;
  firstVisit?: string;
}

export interface Shop {
  id: string;
  slug: string;
  industry: Industry;
  name: string;
  published: boolean;
  phone: string;
  email: string;
  address: string;
  hours: string;
  closedDays: string;
  accessText: string;
  mapUrl: string;
  parking: string;
  reservationUrl: string;
  reservationLabel: string;
  handoffBusinessDays: number;
  extra: ShopExtra;
}

export interface MenuItem {
  id: string;
  shopId: string;
  category: string;
  name: string;
  priceText: string;
  detail: string;
  sortOrder: number;
}

export interface Faq {
  id: string;
  shopId: string;
  question: string;
  answer: string;
  keywords: string[];
  published: boolean;
  sortOrder: number;
}

export interface Catalog {
  shops: Shop[];
  faqs: Faq[];
  menu: MenuItem[];
}

export interface HandoffInput {
  shopId: string;
  customerName: string;
  contact: string;
  question: string;
}

export const INDUSTRY_LABEL: Record<Industry, string> = {
  food: '飲食店・カフェ',
  salon: '美容室・サロン',
  seitai: '整体院・治療院',
};

export const PLAN_LABEL: Record<PlanId, string> = {
  light: 'ライト',
  standard: '標準',
  full: '充実',
};

export const FOOD_SHOP_ID = '11111111-1111-4111-8111-111111111111';
export const SALON_SHOP_ID = '22222222-2222-4222-8222-222222222222';
export const SEITAI_SHOP_ID = '33333333-3333-4333-8333-333333333333';

/** POSIX / JS で同じ意味になる効能断定の禁止パターン。SQL と同期する。 */
export const EFFICACY_CLAIM_SOURCE = '治る|治り|治し|改善|効く|効き|効果がある|完治';
export const EFFICACY_CLAIM = new RegExp(EFFICACY_CLAIM_SOURCE);

export function containsEfficacyClaim(text: string): boolean {
  return EFFICACY_CLAIM.test(text);
}
