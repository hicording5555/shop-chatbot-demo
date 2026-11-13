import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TURNSTILE_TEST_SECRET,
  captchaFailureLog,
  cleanConsultSiteUrl,
  rateLimitIpKey,
  contactOk,
  japanesePhoneOk,
  capKindFromMessage,
  handoffPublicContacts,
  neutralizeFormula,
  recordCapHit,
  parseOrigins,
  turnstileRequired,
  verifyTurnstile,
} from '../supabase/functions/_shared/policy';
import { tokenIsFresh } from '../src/ui/turnstile';

describe('turnstile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not call siteverify when the flag is off', async () => {
    const fetchImpl = vi.fn();
    const result = await verifyTurnstile({
      required: turnstileRequired(undefined),
      secret: TURNSTILE_TEST_SECRET,
      token: '',
      remoteIp: '203.0.113.5',
      action: 'consult',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.result).toBe('skip');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed when the flag is on and the secret is missing', async () => {
    const fetchImpl = vi.fn();
    const result = await verifyTurnstile({
      required: turnstileRequired('true'),
      secret: '  ',
      token: 'some-token',
      remoteIp: '203.0.113.5',
      action: 'consult',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.result).toBe('captcha_failed');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a missing token when the flag is on, without calling siteverify', async () => {
    const fetchImpl = vi.fn();
    const result = await verifyTurnstile({
      required: turnstileRequired('on'),
      secret: TURNSTILE_TEST_SECRET,
      token: '  ',
      remoteIp: '203.0.113.5',
      action: 'handoff',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.result).toBe('captcha_failed');
    expect(result.tokenPresent).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an invalid token when siteverify says no', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: false, hostname: 'shop-chatbot-demo-0lf2.onrender.com', action: 'consult' }),
    }));
    const result = await verifyTurnstile({
      required: true,
      secret: 'secret',
      token: 'bad-token',
      remoteIp: '203.0.113.5',
      action: 'consult',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.result).toBe('captcha_failed');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(String(init.body)).toContain('remoteip=203.0.113.5');
    expect(String(init.body)).toContain('response=bad-token');
  });

  it('accepts a token when siteverify says yes', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, hostname: 'shop-chatbot-demo-0lf2.onrender.com', action: 'handoff' }),
    }));
    const result = await verifyTurnstile({
      required: turnstileRequired('true'),
      secret: 'secret',
      token: 'good-token',
      remoteIp: '203.0.113.5',
      action: 'handoff',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.result).toBe('ok');
  });

  it('rejects a token whose hostname or action does not match', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, hostname: 'localhost', action: 'consult' }),
    }));
    const hostname = await verifyTurnstile({
      required: true,
      secret: 'secret',
      token: 'token',
      remoteIp: '203.0.113.5',
      action: 'consult',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(hostname.result).toBe('captcha_failed');
    expect(hostname.hostnameMatched).toBe(false);
    const action = await verifyTurnstile({
      required: true,
      secret: 'secret',
      token: 'token',
      remoteIp: '203.0.113.5',
      action: 'handoff',
      fetchImpl: (async () => ({
        ok: true,
        json: async () => ({ success: true, hostname: 'shop-chatbot-demo-0lf2.onrender.com', action: 'consult' }),
      })) as unknown as typeof fetch,
    });
    expect(action.result).toBe('captcha_failed');
    expect(action.actionMatched).toBe(false);
  });

  it('returns captcha_failed when siteverify times out or throws', async () => {
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const result = await verifyTurnstile({
      required: true,
      secret: 'secret',
      token: 'token',
      remoteIp: '203.0.113.5',
      action: 'consult',
      timeoutMs: 15,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.result).toBe('captcha_failed');
    expect(result.errorCodes).toEqual(['timeout']);
  });
});

describe('cap hits', () => {
  it('maps each limit message to the rpc kind', () => {
    expect(capKindFromMessage('rate_limited_shop', 'handoff')).toBe('handoff_shop');
    expect(capKindFromMessage('rate_limited_ip', 'handoff')).toBe('handoff_ip');
    expect(capKindFromMessage('rate limited', 'handoff')).toBe('handoff_shop');
    expect(capKindFromMessage('rate_limited_global', 'consult')).toBe('consult_global');
    expect(capKindFromMessage('rate_limited_ip', 'consult')).toBe('consult_ip');
    expect(capKindFromMessage('contact_invalid', 'consult')).toBe('');
  });

  it('records a hit through record_cap_hit and logs only the kind', async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    const lines: string[] = [];
    await recordCapHit({ rpc }, 'consult_ip', (line) => lines.push(line));
    expect(rpc).toHaveBeenCalledWith('record_cap_hit', { p_kind: 'consult_ip' });
    expect(lines).toEqual([]);

    const failing = vi.fn(async () => ({ error: { message: 'database said too much about 山田 a@example.com' } }));
    await recordCapHit({ rpc: failing }, 'handoff_shop', (line) => lines.push(line));
    expect(failing).toHaveBeenCalledWith('record_cap_hit', { p_kind: 'handoff_shop' });
    expect(lines).toEqual(['record_cap_hit failed kind=handoff_shop']);
    expect(lines[0]).not.toContain('山田');
    expect(lines[0]).not.toContain('a@example.com');
  });
});

describe('turnstile freshness', () => {
  it('treats an empty or old token as not fresh', () => {
    const now = 1_000_000;
    expect(tokenIsFresh('', now, now)).toBe(false);
    expect(tokenIsFresh('token', null, now)).toBe(false);
    expect(tokenIsFresh('token', now - 60_000, now)).toBe(true);
    expect(tokenIsFresh('token', now - 5 * 60_000, now)).toBe(false);
  });

  it('logs only presence, error codes, and match flags', () => {
    const line = captchaFailureLog({
      result: 'captcha_failed',
      tokenPresent: false,
      errorCodes: ['invalid-input-response'],
      hostnameMatched: false,
      actionMatched: true,
    });
    expect(line).toContain('"token_present":false');
    expect(line).toContain('invalid-input-response');
    expect(line).not.toContain('secret');
  });
});

describe('consult site url', () => {
  it('allows only empty, http, and https', () => {
    expect(cleanConsultSiteUrl('')).toBe('');
    expect(cleanConsultSiteUrl('  https://example.com/shop  ')).toBe('https://example.com/shop');
    expect(cleanConsultSiteUrl('http://example.com')).toBe('http://example.com');
    expect(cleanConsultSiteUrl('javascript:alert(1)')).toBeNull();
    expect(cleanConsultSiteUrl('data:text/plain,hi')).toBeNull();
    expect(cleanConsultSiteUrl('ftp://example.com')).toBeNull();
    expect(cleanConsultSiteUrl('https:/example.com')).toBeNull();
    expect(cleanConsultSiteUrl('https:evil.example')).toBeNull();
    expect(cleanConsultSiteUrl('https://example.com/\n')).toBeNull();
    expect(cleanConsultSiteUrl('instagram.com/shop')).toBeNull();
  });
});

describe('rate limit ip key', () => {
  it('keeps one key per IPv6 /64 and leaves IPv4 unchanged', () => {
    const same = rateLimitIpKey('2001:db8:1:2::1');
    expect(rateLimitIpKey('2001:db8:1:2::ffff')).toBe(same);
    expect(rateLimitIpKey('2001:0db8:0001:0002:0000:0000:0000:0001')).toBe(same);
    expect(rateLimitIpKey('2001:db8:1:3::1')).not.toBe(same);
    expect(rateLimitIpKey('203.0.113.10')).toBe('203.0.113.10');
    expect(rateLimitIpKey('192.0.2.1')).toBe('192.0.2.1');
    expect(rateLimitIpKey('::ffff:203.0.113.10')).toBe('203.0.113.10');
    expect(rateLimitIpKey('::FFFF:192.0.2.1')).toBe(rateLimitIpKey('192.0.2.1'));
    expect(rateLimitIpKey('0:0:0:0:0:ffff:192.0.2.1')).toBe('192.0.2.1');
  });
});

describe('input guards', () => {
  it('rejects all-same Japanese phone digits', () => {
    expect(japanesePhoneOk('0000000000')).toBe(false);
    expect(contactOk('0000000000')).toBe(false);
    expect(japanesePhoneOk('090-1111-2222')).toBe(true);
    expect(contactOk('owner@example.com')).toBe(true);
    expect(contactOk('000-0000-0000')).toBe(false);
  });

  it('prefixes spreadsheet formulas', () => {
    expect(neutralizeFormula('=HYPERLINK("https://example.invalid")')).toBe('\'=HYPERLINK("https://example.invalid")');
    expect(neutralizeFormula('=SUM(1)')).toBe("'=SUM(1)");
    expect(neutralizeFormula('+81')).toBe("'+81");
    expect(neutralizeFormula('-10')).toBe("'-10");
    expect(neutralizeFormula('@cmd')).toBe("'@cmd");
    expect(neutralizeFormula('\t=1')).toBe("'\t=1");
    expect(neutralizeFormula('山田')).toBe('山田');
  });

  it('returns shop contacts only for a published full plan', () => {
    expect(handoffPublicContacts({ published: false, plan: 'full', phone: '03-0000-0000', email: 'a@example.com' })).toEqual({});
    expect(handoffPublicContacts({ published: true, plan: 'light', phone: '03-0000-0000', email: 'a@example.com' })).toEqual({});
    expect(handoffPublicContacts({ published: true, plan: 'full', phone: '03-0000-3300', email: 'yasuragi@example.com' })).toEqual({
      phone: '03-0000-3300',
      email: 'yasuragi@example.com',
    });
    expect(handoffPublicContacts(null)).toEqual({});
  });

  it('defaults origins to the production site only', () => {
    expect(parseOrigins(undefined)).toEqual(['https://shop-chatbot-demo-0lf2.onrender.com']);
    expect(parseOrigins('http://localhost:5173')).toEqual(['http://localhost:5173']);
  });
});
