import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TURNSTILE_TEST_SECRET,
  contactOk,
  japanesePhoneOk,
  handoffPublicContacts,
  neutralizeFormula,
  parseOrigins,
  turnstileRequired,
  verifyTurnstile,
} from '../supabase/functions/_shared/policy';

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
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe('skip');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed when the flag is on and the secret is missing', async () => {
    const fetchImpl = vi.fn();
    const result = await verifyTurnstile({
      required: turnstileRequired('true'),
      secret: '  ',
      token: 'some-token',
      remoteIp: '203.0.113.5',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe('captcha_failed');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a missing token when the flag is on, without calling siteverify', async () => {
    const fetchImpl = vi.fn();
    const result = await verifyTurnstile({
      required: turnstileRequired('on'),
      secret: TURNSTILE_TEST_SECRET,
      token: '  ',
      remoteIp: '203.0.113.5',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe('captcha_failed');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an invalid token when siteverify says no', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: false }),
    }));
    const result = await verifyTurnstile({
      required: true,
      secret: 'secret',
      token: 'bad-token',
      remoteIp: '203.0.113.5',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe('captcha_failed');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(String(init.body)).toContain('remoteip=203.0.113.5');
    expect(String(init.body)).toContain('response=bad-token');
  });

  it('accepts a token when siteverify says yes', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true }),
    }));
    const result = await verifyTurnstile({
      required: turnstileRequired('true'),
      secret: 'secret',
      token: 'good-token',
      remoteIp: '203.0.113.5',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe('ok');
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
