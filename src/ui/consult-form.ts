import { createPublicClient } from '../lib/supabase';
import { contactOk, japanesePhoneOk } from '../../supabase/functions/_shared/policy';
import { el } from './dom';
import { CAPTCHA_FAILED_MESSAGE, mountTurnstile } from './turnstile';

const INDUSTRIES = ['美容室・サロン', '整体院', '整骨院・鍼灸院', '飲食店', 'その他'] as const;
const PLANS = ['ライト', '標準', '充実', 'まだ決めていない'] as const;
const KINDS = ['モニターを希望', '通常の申し込み', 'まず話を聞きたい'] as const;

export function consultForm(supabaseUrl: string, anonKey: string): HTMLElement {
  const status = el('p', { class: 'error', role: 'alert' });
  status.hidden = true;
  const shopName = field('お店の名前', '例：〇〇美容室', true);
  const industry = radios('業種', INDUSTRIES, 'industry');
  const industryOther = field('業種（その他）', '業種を入力', false);
  const contactName = field('担当者名', '例：山田 太郎', true);
  const email = field('メールアドレス', 'example@example.com', true);
  const phone = field('電話番号', '090-0000-0000', false);
  const siteUrl = field('ホームページまたは予約ページのURL', 'https://', true);
  const plan = radios('希望プラン', PLANS, 'plan');
  const kind = radios('申込の種類', KINDS, 'kind');
  const questions = area('よく来る質問', '例：営業時間、駐車場、キャンセル方法');
  const referrer = field('紹介者の名前', '紹介してくれた方の名前', false);
  const video = radios('ビデオ通話の希望', ['希望しない（メールとフォームで進める）', '希望する（TimeRexの予約リンクを案内）'], 'video', 0);
  const notes = area('備考', 'ご自由にご記入ください');
  const newsletter = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const agreed = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const captcha = el('div', { class: 'turnstile-slot' });
  const widget = mountTurnstile(captcha);
  const form = el('form', { class: 'stack consult-form' }, [
    el('p', null, ['必要事項を送ってください。この画面では決済しません。自動返信メールは送りません。お店への訪問はありません。']),
    el('p', null, [
      'ご入力内容は、導入のご相談への回答と、ご契約の準備のために使います。取扱いは',
      el('a', { href: '/privacy' }, ['プライバシーポリシー']),
      'をご覧ください。',
    ]),
    shopName.label,
    industry.box,
    industryOther.label,
    contactName.label,
    email.label,
    phone.label,
    el('p', { class: 'hint' }, ['電話番号は空欄でも送れます。']),
    siteUrl.label,
    plan.box,
    kind.box,
    questions.label,
    referrer.label,
    video.box,
    notes.label,
    el('label', { class: 'check' }, [newsletter, '今後の案内メールを希望する（チェックしない場合は、この相談への返信と契約の履行に必要なメールのみ送ります）']),
    el('label', { class: 'check' }, [agreed, '個人情報の取扱いに同意する']),
    captcha,
    status,
    el('button', { class: 'button', type: 'submit' }, ['入力内容を確認する']),
  ]) as HTMLFormElement;
  let confirmed = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.hidden = true;
    const industryValue = industry.value();
    const payload = {
      shop_name: shopName.input.value.trim(),
      industry: industryValue,
      industry_other: industryOther.input.value.trim(),
      contact_name: contactName.input.value.trim(),
      email: email.input.value.trim(),
      phone: phone.input.value.trim(),
      site_url: siteUrl.input.value.trim(),
      plan_choice: plan.value(),
      application_kind: kind.value(),
      common_questions: questions.input.value.trim(),
      referrer_name: referrer.input.value.trim(),
      wants_video: video.value().startsWith('希望する'),
      notes: notes.input.value.trim(),
      newsletter_opt_in: newsletter.checked,
      privacy_agreed: agreed.checked,
      turnstile_token: widget.token(),
    };
    const problem = validate(payload);
    if (problem) {
      status.hidden = false;
      status.textContent = problem;
      confirmed = false;
      return;
    }
    if (!confirmed) {
      confirmed = true;
      const back = el('button', { class: 'button ghost', type: 'button' }, ['入力画面に戻る']) as HTMLButtonElement;
      const review = el('div', { class: 'stack review' }, [
        el('h2', null, ['入力内容の確認']),
        el('p', null, [`${payload.shop_name}／${payload.industry}${payload.industry_other ? `（${payload.industry_other}）` : ''}／${payload.contact_name}`]),
        el('p', null, [`${payload.email}${payload.phone ? `　${payload.phone}` : ''}`]),
        el('p', null, [payload.site_url]),
        el('p', null, [`${payload.plan_choice}／${payload.application_kind}`]),
        el('p', null, ['この画面では決済しません。自動返信メールは送りません。']),
        el('div', { class: 'row' }, [
          el('button', { class: 'button', type: 'submit' }, ['この内容で送信する']),
          back,
        ]),
      ]);
      const firstSubmit = form.querySelector('button[type="submit"]');
      if (firstSubmit instanceof HTMLButtonElement) firstSubmit.hidden = true;
      back.addEventListener('click', () => {
        confirmed = false;
        if (firstSubmit instanceof HTMLButtonElement) firstSubmit.hidden = false;
        review.remove();
      });
      form.append(review);
      return;
    }
    const client = createPublicClient(supabaseUrl, anonKey);
    client.functions.invoke('consult', { body: payload }).then(async ({ data, error }) => {
      if (error || (data && data.ok === false)) {
        widget.reset();
        const reason = await functionReason(error, data);
        status.hidden = false;
        status.textContent = reason === 'captcha_failed'
          ? CAPTCHA_FAILED_MESSAGE
          : '送信できませんでした。入力内容を確認して、時間をおいてもう一度お試しください。';
        return;
      }
      form.replaceWith(
        el('div', { class: 'stack' }, [
          el('h2', null, ['ご相談を受け付けました']),
          el('p', null, [`${payload.contact_name}様、${payload.shop_name}様からの内容を受け付けました。自動返信メールは送りません。お店への訪問はありません。`]),
          el('a', { class: 'button', href: '/' }, ['トップへ']),
        ]),
      );
    });
  });
  return form;
}

async function functionReason(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'reason' in data && typeof data.reason === 'string') return data.reason;
  const context = (error as { context?: { json?: () => Promise<{ reason?: string }> } } | null)?.context;
  if (context?.json) {
    try {
      const body = await context.json();
      if (body?.reason) return body.reason;
    } catch {
      return '';
    }
  }
  return '';
}

function validate(input: {
  shop_name: string;
  industry: string;
  industry_other: string;
  contact_name: string;
  email: string;
  phone: string;
  site_url: string;
  plan_choice: string;
  application_kind: string;
  privacy_agreed: boolean;
}): string | null {
  if (!input.shop_name) return 'お店の名前を入力してください';
  if (!input.industry) return '業種を選んでください';
  if (input.industry === 'その他' && !input.industry_other) return '業種を入力してください';
  if (!input.contact_name) return '担当者名を入力してください';
  if (!contactOk(input.email)) return '正しいメールアドレスを入力してください';
  if (input.phone && !japanesePhoneOk(input.phone)) return '電話番号の形式で入力してください（空欄でも送れます）';
  if (!input.site_url.startsWith('https://')) return 'httpsから始まるURLを入力してください';
  if (!input.plan_choice) return '希望プランを選んでください';
  if (!input.application_kind) return '申込の種類を選んでください';
  if (!input.privacy_agreed) return '同意してから送信してください';
  return null;
}

function field(name: string, placeholder: string, required: boolean): { label: HTMLElement; input: HTMLInputElement } {
  const input = el('input', { type: 'text', placeholder, maxlength: '300' }) as HTMLInputElement;
  if (required) input.required = true;
  return { label: el('label', { class: 'field' }, [name, input]), input };
}

function area(name: string, placeholder: string): { label: HTMLElement; input: HTMLTextAreaElement } {
  const input = el('textarea', { placeholder, maxlength: '2000' }) as HTMLTextAreaElement;
  return { label: el('label', { class: 'field' }, [name, input]), input };
}

function radios(name: string, options: readonly string[], group: string, initial = -1): { box: HTMLElement; value: () => string } {
  const inputs = options.map((option, index) => {
    const input = el('input', { type: 'radio', name: group, value: option }) as HTMLInputElement;
    if (index === initial) input.checked = true;
    return el('label', { class: 'check' }, [input, option]);
  });
  return {
    box: el('fieldset', { class: 'stack' }, [el('legend', null, [name]), ...inputs]),
    value: () => options.find((_, index) => (inputs[index].querySelector('input') as HTMLInputElement).checked) ?? '',
  };
}
