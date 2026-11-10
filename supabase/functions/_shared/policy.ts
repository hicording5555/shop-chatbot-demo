export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';
export const PRODUCTION_ORIGIN = 'https://shop-chatbot-demo-0lf2.onrender.com';

export function parseOrigins(configured: string | undefined, fallback = PRODUCTION_ORIGIN): string[] {
  const list = configured?.trim() ? configured.trim() : fallback;
  return list.split(',').map((item) => item.trim()).filter(Boolean);
}

export function turnstileRequired(flag: string | undefined): boolean {
  return ['1', 'true', 'on', 'yes'].includes((flag ?? '').trim().toLowerCase());
}

export async function verifyTurnstile(args: {
  required: boolean;
  secret: string;
  token: string | undefined;
  remoteIp: string;
  fetchImpl?: typeof fetch;
}): Promise<'skip' | 'ok' | 'captcha_failed'> {
  if (!args.required) return 'skip';
  const token = args.token?.trim();
  if (!token) return 'captcha_failed';
  const fetchImpl = args.fetchImpl ?? fetch;
  const body = new URLSearchParams();
  body.set('secret', args.secret);
  body.set('response', token);
  body.set('remoteip', args.remoteIp);
  const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) return 'captcha_failed';
  const payload = (await response.json()) as { success?: boolean };
  return payload.success === true ? 'ok' : 'captcha_failed';
}

export function japanesePhoneOk(contact: string): boolean {
  if (!/^[0-9()（）\s-]+$/.test(contact)) return false;
  const digits = contact.replace(/\D/g, '');
  if (!/^0\d{9,10}$/.test(digits)) return false;
  return !/^(\d)\1+$/.test(digits);
}

export function contactOk(contact: string): boolean {
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(contact)) return true;
  return japanesePhoneOk(contact);
}

export function handoffPublicContacts(shop: { published?: boolean; plan?: string; phone?: string | null; email?: string | null } | null | undefined): { phone: string; email: string } | Record<string, never> {
  if (!shop || shop.published !== true || shop.plan !== 'full') return {};
  return { phone: shop.phone ?? '', email: shop.email ?? '' };
}

export function neutralizeFormula(value: string): string {
  if (!value) return value;
  const first = value[0];
  if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r') {
    return `'${value}`;
  }
  return value;
}
