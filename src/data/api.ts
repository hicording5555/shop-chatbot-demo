import type { SupabaseClient } from '@supabase/supabase-js';
import { createPublicClient } from '../lib/supabase';
import type { Catalog, Faq, Industry, MenuItem, PlanId, Shop, ShopExtra } from '../types';

interface ShopRow {
  id: string;
  slug: string;
  industry: Industry;
  plan?: PlanId;
  name: string;
  published: boolean;
  phone: string;
  email: string;
  address: string;
  hours: string;
  closed_days: string;
  access_text: string;
  map_url: string;
  parking: string;
  reservation_url: string;
  reservation_label: string;
  handoff_business_days: number;
  extra: ShopExtra | null;
}

interface FaqRow {
  id: string;
  shop_id: string;
  question: string;
  answer: string;
  keywords: string[] | null;
  published: boolean;
  sort_order: number;
}

interface MenuRow {
  id: string;
  shop_id: string;
  category: string;
  name: string;
  price_text: string;
  detail: string | null;
  sort_order: number;
}

const INDUSTRY_ORDER: Industry[] = ['food', 'salon', 'seitai'];

export function mapShop(row: ShopRow): Shop {
  return {
    id: row.id,
    slug: row.slug,
    industry: row.industry,
    plan: row.plan ?? 'light',
    name: row.name,
    published: row.published,
    phone: row.phone,
    email: row.email,
    address: row.address,
    hours: row.hours,
    closedDays: row.closed_days,
    accessText: row.access_text,
    mapUrl: row.map_url,
    parking: row.parking,
    reservationUrl: row.reservation_url,
    reservationLabel: row.reservation_label,
    handoffBusinessDays: row.handoff_business_days,
    extra: row.extra ?? {},
  };
}

export function mapFaq(row: FaqRow): Faq {
  return {
    id: row.id,
    shopId: row.shop_id,
    question: row.question,
    answer: row.answer,
    keywords: row.keywords ?? [],
    published: row.published,
    sortOrder: row.sort_order,
  };
}

export function mapMenu(row: MenuRow): MenuItem {
  return {
    id: row.id,
    shopId: row.shop_id,
    category: row.category,
    name: row.name,
    priceText: row.price_text,
    detail: row.detail ?? '',
    sortOrder: row.sort_order,
  };
}

export async function loadPublicCatalog(client: SupabaseClient): Promise<Catalog> {
  const [shops, faqs, menu] = await Promise.all([
    client.from('shops').select('*').eq('published', true),
    client.from('faqs').select('*').eq('published', true).order('sort_order'),
    client.from('menu_items').select('*').order('sort_order'),
  ]);
  if (shops.error) throw new Error(shops.error.message);
  if (faqs.error) throw new Error(faqs.error.message);
  if (menu.error) throw new Error(menu.error.message);
  const mappedShops = ((shops.data ?? []) as ShopRow[]).map(mapShop).sort((a, b) => {
    return INDUSTRY_ORDER.indexOf(a.industry) - INDUSTRY_ORDER.indexOf(b.industry);
  });
  const shopIds = new Set(mappedShops.map((shop) => shop.id));
  return {
    shops: mappedShops,
    faqs: ((faqs.data ?? []) as FaqRow[]).map(mapFaq).filter((faq) => shopIds.has(faq.shopId)),
    menu: ((menu.data ?? []) as MenuRow[]).map(mapMenu).filter((item) => shopIds.has(item.shopId)),
  };
}

export interface HandoffRow {
  id: string;
  customer_name: string;
  contact: string;
  question: string;
  created_at: string;
}

export async function insertHandoff(
  supabaseUrl: string,
  anonKey: string,
  input: { shopId: string; customerName: string; contact: string; question: string },
): Promise<void> {
  const client = createPublicClient(supabaseUrl, anonKey);
  const { data, error } = await client.functions.invoke('handoff', {
    body: {
      shop_id: input.shopId,
      customer_name: input.customerName,
      contact: input.contact,
      question: input.question,
    },
  });
  if (error) {
    let reason = 'unavailable';
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = (await context.json()) as { reason?: string };
        if (body.reason) reason = body.reason;
      } catch {
        reason = 'unavailable';
      }
    }
    throw new Error(reason);
  }
  if (data && typeof data === 'object' && 'ok' in data && data.ok === false) {
    throw new Error(typeof data.reason === 'string' ? data.reason : 'unavailable');
  }
}
