import { TURNSTILE_PRODUCTION_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from '../../supabase/functions/_shared/policy';

export const CAPTCHA_FAILED_MESSAGE = '確認に失敗しました。もう一度お試しください。';
export const TURNSTILE_WAITING_MESSAGE = '確認中です。少し待ってからもう一度押してください。';
export const TURNSTILE_WIDGET_ERROR_MESSAGE = '確認に失敗しました。ページを再読み込みしてもう一度お試しください。';
export const TURNSTILE_FRESH_MS = 4 * 60 * 1000;

export type TurnstileState = 'pending' | 'ok' | 'error' | 'expired';

type RenderOptions = {
  sitekey: string;
  action: string;
  callback: (token: string) => void;
  'error-callback': (code?: string) => void;
  'expired-callback': () => void;
  'timeout-callback': () => void;
};

type TurnstileApi = {
  render: (el: HTMLElement, options: RenderOptions) => string;
  getResponse: (id?: string) => string;
  reset: (id?: string) => void;
};

export type TurnstileHandle = {
  token: () => string;
  reset: () => void;
  state: () => TurnstileState;
  isFresh: (now?: number) => boolean;
  whenReady: () => Promise<string>;
  onChange: (listener: (state: TurnstileState) => void) => () => void;
};

export function tokenIsFresh(token: string, issuedAt: number | null, now = Date.now()): boolean {
  if (!token.trim() || issuedAt === null) return false;
  return now - issuedAt < TURNSTILE_FRESH_MS;
}

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
  let status: TurnstileState = 'pending';
  let currentToken = '';
  let issuedAt: number | null = null;
  const listeners = new Set<(state: TurnstileState) => void>();
  const emit = (next: TurnstileState) => {
    status = next;
    for (const listener of listeners) listener(next);
  };
  const render = () => {
    const turnstile = api();
    if (!turnstile || widgetId) return;
    widgetId = turnstile.render(slot, {
      sitekey: turnstileSiteKey(),
      action,
      callback: (token) => {
        currentToken = token;
        issuedAt = Date.now();
        emit('ok');
      },
      'error-callback': (code) => {
        currentToken = '';
        issuedAt = null;
        if (code) console.warn(code);
        emit('error');
      },
      'expired-callback': () => {
        currentToken = '';
        issuedAt = null;
        emit('expired');
      },
      'timeout-callback': () => {
        currentToken = '';
        issuedAt = null;
        console.warn('timeout');
        emit('error');
      },
    });
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
  const handle: TurnstileHandle = {
    token: () => currentToken,
    state: () => status,
    isFresh: (now = Date.now()) => status === 'ok' && tokenIsFresh(currentToken, issuedAt, now),
    reset: () => {
      currentToken = '';
      issuedAt = null;
      emit('pending');
      const turnstile = api();
      if (turnstile && widgetId) turnstile.reset(widgetId);
    },
    onChange: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    whenReady: () => {
      if (handle.isFresh()) return Promise.resolve(currentToken);
      return new Promise((resolve, reject) => {
        const stop = handle.onChange((next) => {
          if (next === 'ok' && handle.isFresh()) {
            stop();
            resolve(currentToken);
          }
          if (next === 'error') {
            stop();
            reject(new Error('turnstile-error'));
          }
        });
      });
    },
  };
  return handle;
}
