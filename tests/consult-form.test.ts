// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { consultForm } from '../src/ui/consult-form';

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
    expect(other?.hidden).toBe(true);
    const radio = form.querySelector<HTMLInputElement>('input[value="その他"]');
    radio!.checked = true;
    radio!.dispatchEvent(new Event('change'));
    expect(other?.hidden).toBe(false);
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
  });
});
