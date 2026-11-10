import { TURNSTILE_PRODUCTION_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from '../../supabase/functions/_shared/policy';

type TurnstileApi = {
  render: (el: HTMLElement, options: { sitekey: string; action: string }) => string;
  getResponse: (id?: string) => string;
  reset: (id?: string) => void;
};

export const CAPTCHA_FAILED_MESSAGE = '確認に失敗しました。もう一度お試しください。';

export type TurnstileHandle = {
  token: () => string;
  reset: () => void;
};

function api(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

export function turnstileSiteKey(
  hostname = typeof window === 'undefined' ? '' : window.location.hostname,
  configured = import.meta.env.VITE_TURNSTILE_SITE_KEY,
): string {
  const override = configured?.trim();
  if (override) return override;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return TURNSTILE_TEST_SITE_KEY;
  return TURNSTILE_PRODUCTION_SITE_KEY;
}

export function mountTurnstile(host: HTMLElement, action: 'consult' | 'handoff'): TurnstileHandle {
  const slot = document.createElement('div');
  host.append(slot);
  let widgetId = '';
  const render = () => {
    const turnstile = api();
    if (!turnstile || widgetId) return;
    widgetId = turnstile.render(slot, { sitekey: turnstileSiteKey(), action });
  };
  const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
  if (api()) render();
  else if (existing) existing.addEventListener('load', render);
  else {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.dataset.turnstile = '1';
    script.addEventListener('load', render);
    if (!('happyDOM' in window)) document.head.append(script);
  }
  return {
    token: () => api()?.getResponse(widgetId) ?? '',
    reset: () => {
      const turnstile = api();
      if (turnstile && widgetId) turnstile.reset(widgetId);
    },
  };
}
