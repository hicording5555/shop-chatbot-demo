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

export type TurnstileCheck = {
  result: 'skip' | 'ok' | 'captcha_failed';
  tokenPresent: boolean;
  errorCodes: string[];
  hostnameMatched: boolean | null;
  actionMatched: boolean | null;
};

export function captchaFailureLog(check: TurnstileCheck): string {
  return JSON.stringify({
    token_present: check.tokenPresent,
    error_codes: check.errorCodes,
    hostname_matched: check.hostnameMatched,
    action_matched: check.actionMatched,
  });
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
}): Promise<TurnstileCheck> {
  const token = args.token?.trim() ?? '';
  const base = {
    tokenPresent: token.length > 0,
    errorCodes: [] as string[],
    hostnameMatched: null as boolean | null,
    actionMatched: null as boolean | null,
  };
  if (!args.required) return { result: 'skip', ...base };
  const secret = args.secret.trim();
  if (!secret || !token || !args.action) return { result: 'captcha_failed', ...base };
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
    if (!response.ok) {
      return { result: 'captcha_failed', ...base, errorCodes: ['siteverify_http'] };
    }
    const payload = (await response.json()) as {
      success?: boolean;
      hostname?: string;
      action?: string;
      'error-codes'?: string[];
    };
    const hostname = args.hostname ?? TURNSTILE_HOSTNAME;
    const hostnameMatched = payload.hostname === hostname;
    const actionMatched = payload.action === args.action;
    const errorCodes = Array.isArray(payload['error-codes']) ? payload['error-codes'].filter((code) => typeof code === 'string') : [];
    if (payload.success !== true || !hostnameMatched || !actionMatched) {
      return { result: 'captcha_failed', tokenPresent: true, errorCodes, hostnameMatched, actionMatched };
    }
    return { result: 'ok', tokenPresent: true, errorCodes, hostnameMatched, actionMatched };
  } catch {
    return { result: 'captcha_failed', ...base, errorCodes: ['timeout'] };
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

const SITE_URL_CONTROL = /[\u0000-\u001F\u007F]/;
// Live Postgres en_US.UTF-8 [:space:][:cntrl:], plus U+0000.
// Do not use \s: it also matches U+FEFF, which that database check allows.
export const CONSULT_SITE_URL_PATTERN = /^https?:\/\/[^\u0000-\u0020\u007f-\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/iu;

export function cleanConsultSiteUrl(raw: string): string | null {
  if (SITE_URL_CONTROL.test(raw)) return null;
  const value = raw.trim();
  if (value === '') return '';
  if (!CONSULT_SITE_URL_PATTERN.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return value;
  } catch {
    return null;
  }
}

function canonicalIpv4(value: string): string | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
  if (!match) return null;
  const parts = match.slice(1).map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part > 255)) return null;
  return parts.join('.');
}

function parseIpv6(value: string): number[] | null {
  const lower = value.toLowerCase();
  if (lower.includes('.')) {
    const lastColon = lower.lastIndexOf(':');
    if (lastColon < 0) return null;
    const v4 = canonicalIpv4(lower.slice(lastColon + 1));
    if (!v4) return null;
    const [a, b, c, d] = v4.split('.').map(Number);
    const hi = ((a << 8) | b).toString(16);
    const lo = ((c << 8) | d).toString(16);
    return parseIpv6(`${lower.slice(0, lastColon)}:${hi}:${lo}`);
  }
  const halves = lower.split('::');
  if (halves.length > 2) return null;
  const parseSide = (side: string): number[] | null => {
    if (side === '') return [];
    const parts = side.split(':');
    if (parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
    return parts.map((part) => Number.parseInt(part, 16));
  };
  if (halves.length === 1) {
    const parts = parseSide(halves[0]);
    return parts && parts.length === 8 ? parts : null;
  }
  const left = parseSide(halves[0]);
  const right = parseSide(halves[1]);
  if (!left || !right || left.length + right.length >= 8) return null;
  return [...left, ...Array<number>(8 - left.length - right.length).fill(0), ...right];
}

function ipv4FromMapped(parts: number[]): string {
  const hi = parts[6] ?? 0;
  const lo = parts[7] ?? 0;
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** Address used for the IP send-count. IPv4 is unchanged. IPv6 keeps only the /64 prefix. */
export function rateLimitIpKey(ip: string): string {
  const raw = ip.trim().split('%')[0] ?? ip.trim();
  const v4 = canonicalIpv4(raw);
  if (v4) return v4;
  const v6 = parseIpv6(raw);
  if (!v6) return ip.trim();
  const mapped = v6[0] === 0 && v6[1] === 0 && v6[2] === 0 && v6[3] === 0 && v6[4] === 0 && v6[5] === 0xffff;
  if (mapped) return ipv4FromMapped(v6);
  return v6.slice(0, 4).map((part) => part.toString(16)).join(':');
}

export function contactOk(contact: string): boolean {
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(contact)) return true;
  return japanesePhoneOk(contact);
}

export function handoffPublicContacts(shop: { published?: boolean; plan?: string; phone?: string | null; email?: string | null } | null | undefined): { phone: string; email: string } | Record<string, never> {
  if (!shop || shop.published !== true || shop.plan !== 'full') return {};
  return { phone: shop.phone ?? '', email: shop.email ?? '' };
}

export type CapKind = 'consult_global' | 'consult_ip' | 'handoff_shop' | 'handoff_ip';

export function capKindFromMessage(message: string, scope: 'consult' | 'handoff'): CapKind | '' {
  if (scope === 'consult') {
    if (/rate_limited_global/i.test(message)) return 'consult_global';
    if (/rate_limited_ip/i.test(message)) return 'consult_ip';
    if (/rate[_ ]limited/i.test(message)) return 'consult_global';
    return '';
  }
  if (/rate_limited_shop/i.test(message)) return 'handoff_shop';
  if (/rate_limited_ip/i.test(message)) return 'handoff_ip';
  if (/rate[_ ]limited/i.test(message)) return 'handoff_shop';
  return '';
}

export async function recordCapHit(
  admin: { rpc: (name: string, args: { p_kind: string }) => Promise<{ error: { message?: string } | null }> },
  kind: CapKind,
  log: (line: string) => void = (line) => console.error(line),
): Promise<void> {
  try {
    const recorded = await admin.rpc('record_cap_hit', { p_kind: kind });
    if (recorded.error) log(`record_cap_hit failed kind=${kind}`);
  } catch {
    log(`record_cap_hit failed kind=${kind}`);
  }
}

export function neutralizeFormula(value: string): string {
  if (!value) return value;
  const first = value[0];
  if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r') {
    return `'${value}`;
  }
  return value;
}
