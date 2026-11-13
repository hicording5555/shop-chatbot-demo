// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { CONSULT_RATE_LIMIT_MESSAGE, consultForm } from '../src/ui/consult-form';

function mounted(): HTMLFormElement {
  document.body.replaceChildren(consultForm('http://127.0.0.1:54321', 'fixture-anon-key'));
  const form = document.querySelector('form');
  if (!form) throw new Error('form missing');
  return form;
}

describe('consult form', () => {
  it('uses novalidate and shows the other-industry field only for その他', () => {
    const form = mounted();
    expect(form.noValidate).toBe(true);
    expect(form.getAttribute('novalidate')).not.toBeNull();
    const other = Array.from(form.querySelectorAll('label')).find((label) => label.textContent?.startsWith('業種（その他）'));
    expect((other?.closest('.field-wrap') as HTMLElement).hidden).toBe(true);
    const radio = form.querySelector<HTMLInputElement>('input[value="その他"]');
    radio!.checked = true;
    radio!.dispatchEvent(new Event('change'));
    expect((other?.closest('.field-wrap') as HTMLElement).hidden).toBe(false);
    expect(form.textContent).not.toContain('TimeRex');
    expect(form.textContent).not.toContain('ビデオ通話');
  });

  it('confirms every field that will be sent, including optional ones', () => {
    const form = mounted();
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
    form.querySelector<HTMLInputElement>('input[placeholder="紹介してくれた方の名前"]')!.value = '紹介さん';
    const agreed = Array.from(form.querySelectorAll('label')).find((label) => label.textContent?.includes('個人情報の取扱いに同意する'));
    agreed?.querySelector('input')?.click();
    form.requestSubmit();
    expect(form.textContent).toContain('入力内容の確認');
    expect(form.textContent).toContain('紹介者の名前：紹介さん');
    expect(form.textContent).toContain('電話番号：（未記入）');
    expect(form.textContent).toContain('ホームページまたは予約ページのURL：（未記入）');
    expect((form.querySelector('.review') as HTMLElement).hidden).toBe(false);
    expect(form.querySelector('.review')?.textContent).not.toContain('業種（その他）');
  });

  it('shows a field error under the field and a summary above the button', () => {
    const form = mounted();
    form.requestSubmit();
    const input = form.querySelector<HTMLInputElement>('input[placeholder="例：〇〇美容室"]');
    const fieldError = input?.closest('.field-wrap')?.querySelector('.field-error') as HTMLElement;
    const summary = form.querySelector('.form-summary') as HTMLElement;
    const button = form.querySelector('button[type="submit"]');
    expect(fieldError.hidden).toBe(false);
    expect(fieldError.textContent).toBe('お店の名前を入力してください');
    expect(summary.hidden).toBe(false);
    expect(summary.textContent).toBe('お店の名前を入力してください');
    expect(summary.compareDocumentPosition(button as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(CONSULT_RATE_LIMIT_MESSAGE).toBe('時間をおいてもう一度お試しください。');
  });

  it('asks for a full http or https URL and still allows a blank', () => {
    const form = mounted();
    const value = (placeholder: string, text: string) => {
      const input = form.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`);
      if (!input) throw new Error(placeholder);
      input.value = text;
    };
    value('例：〇〇美容室', '再監査テスト店');
    value('例：山田 太郎', '山田 太郎');
    value('example@example.com', 'reaudit@example.com');
    value('https://example.com', 'https:/example.com');
    form.querySelector<HTMLInputElement>('input[value="飲食店"]')!.checked = true;
    form.querySelector<HTMLInputElement>('input[value="まず話を聞きたい"]')!.checked = true;
    form.querySelector<HTMLInputElement>('input[value="ライト"]')!.checked = true;
    const agreed = Array.from(form.querySelectorAll('label')).find((label) => label.textContent?.includes('個人情報の取扱いに同意する'));
    agreed?.querySelector('input')?.click();
    form.requestSubmit();
    const url = form.querySelector<HTMLInputElement>('input[placeholder="https://example.com"]');
    const fieldError = url?.closest('.field-wrap')?.querySelector('.field-error');
    expect(fieldError?.textContent).toBe('http:// または https:// から始まる完全なURLを入力してください（空欄でも送れます）');
  });

  it('clears the consent error when the checkbox is checked', () => {
    const form = mounted();
    form.requestSubmit();
    const consent = Array.from(form.querySelectorAll('.field-error')).find((node) => node.textContent === '同意してから送信してください') as HTMLElement;
    expect(consent.hidden).toBe(false);
    const agreed = Array.from(form.querySelectorAll('label')).find((label) => label.textContent?.includes('個人情報の取扱いに同意する'));
    agreed?.querySelector('input')?.click();
    expect(consent.hidden).toBe(true);
    expect(consent.textContent).toBe('');
  });

  it('shows the review button again and clears errors after going back', () => {
    const form = mounted();
    form.requestSubmit();
    expect(form.textContent).toContain('お店の名前を入力してください');
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
    form.requestSubmit();
    const reviewButton = Array.from(form.querySelectorAll('button')).find((button) => button.textContent === '入力内容を確認する') as HTMLButtonElement;
    expect(reviewButton.hidden).toBe(true);
    form.requestSubmit();
    expect(form.textContent).toContain('確認中です');
    const back = Array.from(form.querySelectorAll('button')).find((button) => button.textContent === '入力画面に戻る');
    back?.click();
    expect(reviewButton.hidden).toBe(false);
    expect(form.querySelector('.review')?.textContent ?? '').not.toContain('確認中です');
    for (const error of Array.from(form.querySelectorAll('.field-error, .form-summary'))) {
      expect((error as HTMLElement).hidden).toBe(true);
      expect(error.textContent).toBe('');
    }
  });
});
