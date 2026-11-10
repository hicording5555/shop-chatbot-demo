import { createPublicClient } from '../lib/supabase';
import { OPERATOR_CONTACT_PLACEHOLDER, contactOk, japanesePhoneOk } from '../../supabase/functions/_shared/policy';
import { el } from './dom';
import { CAPTCHA_FAILED_MESSAGE, mountTurnstile } from './turnstile';

const INDUSTRIES = ['美容室・サロン', '整体院', '整骨院・鍼灸院', '飲食店', 'その他'] as const;
const PLANS = ['ライト', '標準', '充実', 'まだ決めていない'] as const;
const KINDS = ['まず話を聞きたい', 'モニターを希望', '通常の申し込み'] as const;

type Payload = {
  shop_name: string;
  industry: string;
  industry_other: string;
  contact_name: string;
  email: string;
  phone: string;
  site_url: string;
  plan_choice: string;
  application_kind: string;
  common_questions: string;
  referrer_name: string;
  notes: string;
  newsletter_opt_in: boolean;
  privacy_agreed: boolean;
  turnstile_token: string;
};

export function consultForm(supabaseUrl: string, anonKey: string): HTMLElement {
  const status = el('p', { class: 'error', role: 'alert' });
  status.hidden = true;
  const shopName = field('お店の名前', '例：〇〇美容室', 80);
  const industry = radios('業種', INDUSTRIES, 'industry');
  const industryOther = field('業種（その他）', '業種を入力', 80);
  industryOther.label.hidden = true;
  industry.onChange(() => {
    industryOther.label.hidden = industry.value() !== 'その他';
  });
  const contactName = field('担当者名', '例：山田 太郎', 80);
  const email = field('メールアドレス', 'example@example.com', 120);
  const phone = field('電話番号', '090-1234-5678', 40);
  const siteUrl = field('ホームページまたは予約ページのURL', 'https:// または SNSのURL', 300);
  const plan = radios('希望プラン', PLANS, 'plan');
  const kind = radios('申込の種類', KINDS, 'kind');
  const questions = area('よく来る質問', '例：営業時間、駐車場、キャンセル方法', 2000);
  const referrer = field('紹介者の名前', '紹介してくれた方の名前', 80);
  const notes = area('備考', 'ご自由にご記入ください', 2000);
  const newsletter = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const agreed = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const captcha = el('div', { class: 'turnstile-slot' });
  const widget = mountTurnstile(captcha, 'consult');
  const fields = el('div', { class: 'stack' }, [
    shopName.label,
    industry.box,
    industryOther.label,
    contactName.label,
    email.label,
    phone.label,
    el('p', { class: 'hint' }, ['電話番号は空欄でも送れます。']),
    siteUrl.label,
    el('p', { class: 'hint' }, ['ない場合は空欄か、SNSのURLでも構いません。']),
    plan.box,
    kind.box,
    questions.label,
    referrer.label,
    notes.label,
    el('label', { class: 'check' }, [newsletter, '今後の案内メールを希望する（チェックしない場合は、この相談への返信と契約の履行に必要なメールのみ送ります）']),
    el('label', { class: 'check' }, [agreed, '個人情報の取扱いに同意する']),
    captcha,
  ]);
  const review = el('div', { class: 'stack review' });
  review.hidden = true;
  const form = el('form', { class: 'stack consult-form', novalidate: 'true' }, [
    el('p', null, ['必要事項を送ってください。この画面では決済しません。自動返信メールは送りません。お店への訪問はありません。']),
    el('p', null, [
      'ご入力内容は、導入のご相談への回答と、ご契約の準備のために使います。取扱いは',
      el('a', { href: '/privacy' }, ['プライバシーポリシー']),
      'をご覧ください。',
    ]),
    fields,
    status,
    el('button', { class: 'button', type: 'submit' }, ['入力内容を確認する']),
    review,
  ]) as HTMLFormElement;
  form.noValidate = true;
  let confirmed = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.hidden = true;
    const payload: Payload = {
      shop_name: shopName.input.value.trim(),
      industry: industry.value(),
      industry_other: industry.value() === 'その他' ? industryOther.input.value.trim() : '',
      contact_name: contactName.input.value.trim(),
      email: email.input.value.trim(),
      phone: phone.input.value.trim(),
      site_url: siteUrl.input.value.trim(),
      plan_choice: plan.value(),
      application_kind: kind.value(),
      common_questions: questions.input.value.trim(),
      referrer_name: referrer.input.value.trim(),
      notes: notes.input.value.trim(),
      newsletter_opt_in: newsletter.checked,
      privacy_agreed: agreed.checked,
      turnstile_token: widget.token(),
    };
    if (!confirmed) {
      const problem = validate(payload, {
        shopName: shopName.input,
        industry: industry.first(),
        industryOther: industryOther.input,
        contactName: contactName.input,
        email: email.input,
        phone: phone.input,
        siteUrl: siteUrl.input,
        plan: plan.first(),
        kind: kind.first(),
        agreed,
      });
      if (problem) {
        status.hidden = false;
        status.textContent = problem.message;
        problem.field.focus();
        return;
      }
      confirmed = true;
      fields.hidden = true;
      review.hidden = false;
      review.replaceChildren(
        el('h2', null, ['入力内容の確認']),
        line('お店の名前', payload.shop_name),
        line('業種', payload.industry),
        line('業種（その他）', payload.industry_other),
        line('担当者名', payload.contact_name),
        line('メールアドレス', payload.email),
        line('電話番号', payload.phone),
        line('ホームページまたは予約ページのURL', payload.site_url),
        line('希望プラン', payload.plan_choice),
        line('申込の種類', payload.application_kind),
        line('よく来る質問', payload.common_questions),
        line('紹介者の名前', payload.referrer_name),
        line('備考', payload.notes),
        line('案内メール', payload.newsletter_opt_in ? '希望する' : '希望しない'),
        line('個人情報の取扱いへの同意', payload.privacy_agreed ? '同意する' : '同意しない'),
        el('p', null, ['この画面では決済しません。自動返信メールは送りません。']),
        el('div', { class: 'row' }, [
          el('button', { class: 'button', type: 'submit' }, ['この内容で送信する']),
          backButton(),
        ]),
      );
      review.scrollIntoView?.({ block: 'start' });
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
          : reason === 'rate_limited'
            ? `ただいま送信が集中しています。恐れ入りますが、${OPERATOR_CONTACT_PLACEHOLDER}までご連絡ください。`
            : '送信できませんでした。入力内容を確認して、時間をおいてもう一度お試しください。';
        return;
      }
      form.replaceWith(
        el('div', { class: 'stack' }, [
          el('h2', null, ['ご相談を受け付けました']),
          el('p', null, [`${payload.shop_name}（担当：${payload.contact_name}様）からの内容を受け付けました。`]),
          el('p', null, ['内容を確認のうえ、通常3営業日以内に、ご記入のメールへご連絡します。自動返信メールは送りません。お店への訪問はありません。']),
          el('a', { class: 'button', href: '/' }, ['トップへ']),
        ]),
      );
    });

    function backButton(): HTMLButtonElement {
      const back = el('button', { class: 'button ghost', type: 'button' }, ['入力画面に戻る']) as HTMLButtonElement;
      back.addEventListener('click', () => {
        confirmed = false;
        fields.hidden = false;
        review.hidden = true;
        review.replaceChildren();
      });
      return back;
    }
  });
  return form;
}

function line(label: string, value: string): HTMLElement {
  return el('p', null, [`${label}：${value || '（未記入）'}`]);
}

function validate(
  input: Payload,
  fields: {
    shopName: HTMLInputElement;
    industry: HTMLElement;
    industryOther: HTMLInputElement;
    contactName: HTMLInputElement;
    email: HTMLInputElement;
    phone: HTMLInputElement;
    siteUrl: HTMLInputElement;
    plan: HTMLElement;
    kind: HTMLElement;
    agreed: HTMLInputElement;
  },
): { message: string; field: HTMLElement } | null {
  if (!input.shop_name) return { message: 'お店の名前を入力してください', field: fields.shopName };
  if (!input.industry) return { message: '業種を選んでください', field: fields.industry };
  if (input.industry === 'その他' && !input.industry_other) return { message: '業種を入力してください', field: fields.industryOther };
  if (!input.contact_name) return { message: '担当者名を入力してください', field: fields.contactName };
  if (!contactOk(input.email)) return { message: '正しいメールアドレスを入力してください', field: fields.email };
  if (input.phone && !japanesePhoneOk(input.phone)) return { message: '電話番号の形式で入力してください（空欄でも送れます）', field: fields.phone };
  if (input.site_url.length > 300) return { message: 'URLは300文字以内で入力してください', field: fields.siteUrl };
  if (!input.plan_choice) return { message: '希望プランを選んでください', field: fields.plan };
  if (!input.application_kind) return { message: '申込の種類を選んでください', field: fields.kind };
  if (!input.privacy_agreed) return { message: '同意してから送信してください', field: fields.agreed };
  return null;
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

function field(name: string, placeholder: string, max: number): { label: HTMLElement; input: HTMLInputElement } {
  const input = el('input', { type: 'text', placeholder, maxlength: String(max) }) as HTMLInputElement;
  return { label: el('label', { class: 'field' }, [name, input]), input };
}

function area(name: string, placeholder: string, max: number): { label: HTMLElement; input: HTMLTextAreaElement } {
  const input = el('textarea', { placeholder, maxlength: String(max) }) as HTMLTextAreaElement;
  return { label: el('label', { class: 'field' }, [name, input]), input };
}

function radios(name: string, options: readonly string[], group: string): { box: HTMLElement; value: () => string; first: () => HTMLElement; onChange: (listener: () => void) => void } {
  const inputs = options.map((option) => {
    const input = el('input', { type: 'radio', name: group, value: option }) as HTMLInputElement;
    return { option, input, label: el('label', { class: 'check' }, [input, option]) };
  });
  return {
    box: el('fieldset', { class: 'stack' }, [el('legend', null, [name]), ...inputs.map((item) => item.label)]),
    value: () => inputs.find((item) => item.input.checked)?.option ?? '',
    first: () => inputs[0].input,
    onChange: (listener) => {
      for (const item of inputs) item.input.addEventListener('change', listener);
    },
  };
}
