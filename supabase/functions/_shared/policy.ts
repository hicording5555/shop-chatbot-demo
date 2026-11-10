export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';
export const TURNSTILE_PRODUCTION_SITE_KEY = '0x4AAAAAAF7FrmGh7EBiJfGh';
export const TURNSTILE_HOSTNAME = 'shop-chatbot-demo-0lf2.onrender.com';
export const PRODUCTION_ORIGIN = 'https://shop-chatbot-demo-0lf2.onrender.com';
export const OPERATOR_CONTACT_PLACEHOLDER = '【連絡先メール】';

/**
 * Phone number spec (consult phone is optional; a handoff contact is an email or a phone):
 * - Allowed characters: digits, spaces, hyphens, and ASCII or fullwidth parentheses.
 * - Digits only, after removing the other allowed characters: 10 or 11 digits, and the first digit is 0.
 * - Reject numbers whose digits are all the same, such as 0000000000.
 * - A leading plus, including +81, is not a valid phone. Use the domestic form that starts with 0.
 * - An email is a single address with one @ and a dot in the domain, and no spaces.
 */

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
  action: string;
  hostname?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<'skip' | 'ok' | 'captcha_failed'> {
  if (!args.required) return 'skip';
  const secret = args.secret.trim();
  const token = args.token?.trim();
  if (!secret || !token || !args.action) return 'captcha_failed';
  const fetchImpl = args.fetchImpl ?? fetch;
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  body.set('remoteip', args.remoteIp);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 5000);
  try {
    const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    if (!response.ok) return 'captcha_failed';
    const payload = (await response.json()) as { success?: boolean; hostname?: string; action?: string };
    const hostname = args.hostname ?? TURNSTILE_HOSTNAME;
    if (payload.success !== true || payload.hostname !== hostname || payload.action !== args.action) return 'captcha_failed';
    return 'ok';
  } catch {
    return 'captcha_failed';
  } finally {
    clearTimeout(timeout);
  }
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
