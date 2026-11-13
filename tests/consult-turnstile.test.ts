// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn(async () => ({ data: { ok: true }, error: null }));
vi.mock('../src/lib/supabase', () => ({
  createPublicClient: () => ({ functions: { invoke } }),
}));

import { consultForm } from '../src/ui/consult-form';
import { TURNSTILE_WAITING_MESSAGE } from '../src/ui/turnstile';

type Handlers = {
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': (code?: string) => void;
};

function installTurnstile(autoToken = false): { handlers: () => Handlers | null; reset: ReturnType<typeof vi.fn> } {
  let handlers: Handlers | null = null;
  const reset = vi.fn();
  (window as Window & { turnstile?: unknown }).turnstile = {
    render(_el: HTMLElement, options: Handlers) {
      handlers = options;
      if (autoToken) options.callback('fresh-token');
      return 'widget-1';
    },
    getResponse: () => 'fresh-token',
    reset,
  };
  return { handlers: () => handlers, reset };
}

function fill(form: HTMLFormElement): void {
  const value = (placeholder: string, text: string) => {
    const input = form.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`);
    if (!input) throw new Error(placeholder);
    input.value = text;
  };
  value('例：〇〇美容室', '再監査テスト店');
  value('例：山田 太郎', '山田 太郎');
  value('example@example.com', 'reaudit@example.com');
  form.querySelector<HTMLInputElement>('input[value="飲食店"]')!.checked = true;
  form.querySelector<HTMLInputElement>('input[value="まず話を聞きたい"]')!.checked = true;
  form.querySelector<HTMLInputElement>('input[value="ライト"]')!.checked = true;
  const agreed = Array.from(form.querySelectorAll('label')).find((label) => label.textContent?.includes('個人情報の取扱いに同意する'));
  agreed?.querySelector('input')?.click();
}

function hiddenAncestor(node: Element | null): boolean {
  let current = node?.parentElement ?? null;
  while (current) {
    if ((current as HTMLElement).hidden) return true;
    current = current.parentElement;
  }
  return false;
}

describe('consult turnstile', () => {
  beforeEach(() => {
    invoke.mockClear();
    document.body.replaceChildren();
  });

  it('keeps the widget visible and does not send without a token', () => {
    installTurnstile(false);
    const form = consultForm('http://127.0.0.1:54321', 'fixture-anon-key') as HTMLFormElement;
    document.body.append(form);
    fill(form);
    form.requestSubmit();
    const slot = form.querySelector('.turnstile-slot');
    const review = form.querySelector('.review') as HTMLElement;
    expect(review.hidden).toBe(false);
    expect(review.contains(slot)).toBe(true);
    expect(hiddenAncestor(slot)).toBe(false);
    form.requestSubmit();
    const status = review.querySelector('.form-summary') as HTMLElement;
    const button = review.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(status.hidden).toBe(false);
    expect(status.textContent).toBe(TURNSTILE_WAITING_MESSAGE);
    expect(status.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.disabled).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('does not send a stale token', () => {
    const fake = installTurnstile(true);
    const form = consultForm('http://127.0.0.1:54321', 'fixture-anon-key') as HTMLFormElement;
    document.body.append(form);
    fill(form);
    const clock = vi.spyOn(Date, 'now');
    const issued = 1_700_000_000_000;
    clock.mockReturnValue(issued);
    form.requestSubmit();
    clock.mockReturnValue(issued + 5 * 60 * 1000);
    form.requestSubmit();
    expect(invoke).not.toHaveBeenCalled();
    expect(fake.reset).toHaveBeenCalled();
    expect((form.querySelector('.review .form-summary') as HTMLElement).textContent).toBe(TURNSTILE_WAITING_MESSAGE);
    clock.mockRestore();
  });

  it('replaces the confirm screen after a 200 response', async () => {
    installTurnstile(true);
    const form = consultForm('http://127.0.0.1:54321', 'fixture-anon-key') as HTMLFormElement;
    document.body.append(form);
    fill(form);
    let resolveInvoke: (value: { data: { ok: boolean }; error: null }) => void = () => {};
    const pending = new Promise<{ data: { ok: boolean }; error: null }>((resolve) => {
      resolveInvoke = resolve;
    });
    invoke.mockImplementationOnce(() => pending);
    form.requestSubmit();
    form.requestSubmit();
    const sendButton = form.querySelector('.review button[type="submit"]') as HTMLButtonElement;
    expect(sendButton.disabled).toBe(true);
    expect(form.querySelector('.review .form-summary')?.textContent).toBe('送信中…');
    resolveInvoke({ data: { ok: true }, error: null });
    await pending;
    await Promise.resolve();
    const success = form.querySelector('.consult-success') as HTMLElement;
    expect(success.hidden).toBe(false);
    expect(success.textContent).toContain('ご相談を受け付けました');
    expect(success.textContent).toContain('通常3営業日以内');
    expect(success.getAttribute('role')).toBe('status');
    expect(hiddenAncestor(success)).toBe(false);
    expect(form.querySelector('button[type="submit"]')).toBeNull();
    expect(form.querySelector('.turnstile-slot')).toBeNull();
  });
});
