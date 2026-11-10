import { describe, expect, it } from 'vitest';
import { TURNSTILE_PRODUCTION_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from '../supabase/functions/_shared/policy';
import { turnstileSiteKey } from '../src/ui/turnstile';

describe('turnstile site key', () => {
  it('uses the committed production key on the public hostname', () => {
    expect(turnstileSiteKey('shop-chatbot-demo-0lf2.onrender.com', '')).toBe(TURNSTILE_PRODUCTION_SITE_KEY);
    expect(TURNSTILE_PRODUCTION_SITE_KEY).toBe('0x4AAAAAAF7FrmGh7EBiJfGh');
  });

  it('uses the always-pass test key on localhost', () => {
    expect(turnstileSiteKey('localhost', '')).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(turnstileSiteKey('127.0.0.1', undefined)).toBe(TURNSTILE_TEST_SITE_KEY);
  });

  it('lets VITE_TURNSTILE_SITE_KEY override the hostname default', () => {
    expect(turnstileSiteKey('localhost', 'override-key')).toBe('override-key');
    expect(turnstileSiteKey('shop-chatbot-demo-0lf2.onrender.com', 'override-key')).toBe('override-key');
  });
});
