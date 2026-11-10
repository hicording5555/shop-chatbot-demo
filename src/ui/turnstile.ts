import { TURNSTILE_TEST_SITE_KEY } from '../../supabase/functions/_shared/policy';

type TurnstileApi = {
  render: (el: HTMLElement, options: { sitekey: string }) => string;
  getResponse: (id?: string) => string;
};

function api(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

export function turnstileSiteKey(): string {
  const configured = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  return configured || TURNSTILE_TEST_SITE_KEY;
}

export function mountTurnstile(host: HTMLElement): () => string {
  const slot = document.createElement('div');
  host.append(slot);
  let widgetId = '';
  const render = () => {
    const turnstile = api();
    if (!turnstile || widgetId) return;
    widgetId = turnstile.render(slot, { sitekey: turnstileSiteKey() });
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
    document.head.append(script);
  }
  return () => api()?.getResponse(widgetId) ?? '';
}
