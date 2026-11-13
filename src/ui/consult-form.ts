import { createPublicClient } from '../lib/supabase';
import { cleanConsultSiteUrl, contactOk, japanesePhoneOk } from '../../supabase/functions/_shared/policy';
import { el } from './dom';
import { CAPTCHA_FAILED_MESSAGE, TURNSTILE_WAITING_MESSAGE, TURNSTILE_WIDGET_ERROR_MESSAGE, mountTurnstile, type TurnstileHandle } from './turnstile';

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

export const CONSULT_RATE_LIMIT_MESSAGE = '時間をおいてもう一度お試しください。';

export function consultFailureMessage(reason: string): string {
  if (reason === 'captcha_failed') return CAPTCHA_FAILED_MESSAGE;
  if (reason === 'rate_limited') return CONSULT_RATE_LIMIT_MESSAGE;
  return '送信できませんでした。入力内容を確認して、時間をおいてもう一度お試しください。';
}

function httpStatus(result: { response?: { status?: number }; error?: { context?: { status?: number } } | null }): number | undefined {
  if (typeof result.response?.status === 'number') return result.response.status;
  if (typeof result.error?.context?.status === 'number') return result.error.context.status;
  return undefined;
}

function consultAccepted(data: unknown, error: unknown, status: number | undefined): boolean {
  const okFlag = data && typeof data === 'object' && 'ok' in data ? (data as { ok?: unknown }).ok : undefined;
  if (okFlag === true) return true;
  if (okFlag === false) return false;
  if (error) return false;
  return typeof status === 'number' ? status >= 200 && status < 300 : true;
}

function showConsultSuccess(form: HTMLFormElement, shopName: string, contactName: string): void {
  const success = el('div', { class: 'consult-success', role: 'status', 'aria-live': 'polite', tabindex: '-1' }, [
    el('h2', null, ['ご相談を受け付けました']),
    el('p', null, [`${shopName}（担当：${contactName}様）からの内容を受け付けました。`]),
    el('p', null, ['内容を確認のうえ、通常3営業日以内に、ご記入のメールへご連絡します。自動返信メールは送りません。お店への訪問はありません。']),
    el('a', { class: 'button', href: '/' }, ['トップへ']),
  ]);
  form.replaceChildren(success);
  success.scrollIntoView?.({ block: 'center' });
  success.focus();
}

export function consultForm(supabaseUrl: string, anonKey: string): HTMLElement {
  const summary = el('p', { class: 'error form-summary', role: 'alert' });
  summary.hidden = true;
  const shopName = field('お店の名前', '例：〇〇美容室', 80);
  const industry = radios('業種', INDUSTRIES, 'industry');
  const industryOther = field('業種（その他）', '業種を入力', 80);
  industryOther.wrap.hidden = true;
  industry.onChange(() => {
    industryOther.wrap.hidden = industry.value() !== 'その他';
    if (industryOther.wrap.hidden) clearField(industryOther);
  });
  const contactName = field('担当者名', '例：山田 太郎', 80);
  const email = field('メールアドレス', 'example@example.com', 120);
  const phone = field('電話番号', '090-1234-5678', 40);
  const siteUrl = field('ホームページまたは予約ページのURL', 'https://example.com', 300);
  const plan = radios('希望プラン', PLANS, 'plan');
  const kind = radios('申込の種類', KINDS, 'kind');
  const questions = area('よく来る質問', '例：営業時間、駐車場、キャンセル方法', 2000);
  const referrer = field('紹介者の名前', '紹介してくれた方の名前', 80);
  const notes = area('備考', 'ご自由にご記入ください', 2000);
  const newsletter = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const agreed = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const agreedError = errorLine();
  const captcha = el('div', { class: 'turnstile-slot' });
  let widget: TurnstileHandle | null = null;
  const fields = el('div', { class: 'stack' }, [
    shopName.wrap,
    industry.box,
    industryOther.wrap,
    contactName.wrap,
    email.wrap,
    phone.wrap,
    el('p', { class: 'hint' }, ['電話番号は空欄でも送れます。']),
    siteUrl.wrap,
    el('p', { class: 'hint' }, ['ない場合は空欄でも構いません。書くときは http:// または https:// から始めてください。']),
    plan.box,
    kind.box,
    questions.wrap,
    referrer.wrap,
    notes.wrap,
    el('label', { class: 'check' }, [newsletter, '今後の案内メールを希望する（チェックしない場合は、この相談への返信と契約の履行に必要なメールのみ送ります）']),
    el('label', { class: 'check' }, [agreed, '個人情報の取扱いに同意する']),
    agreedError,
  ]);
  const review = el('div', { class: 'stack review' });
  review.hidden = true;
  const confirmStatus = el('p', { class: 'error form-summary', role: 'alert' });
  confirmStatus.hidden = true;
  const form = el('form', { class: 'stack consult-form', novalidate: 'true' }, [
    el('p', null, ['必要事項を送ってください。この画面では決済しません。自動返信メールは送りません。お店への訪問はありません。']),
    el('p', null, [
      'ご入力内容は、導入のご相談への回答と、ご契約の準備のために使います。取扱いは',
      el('a', { href: '/privacy' }, ['プライバシーポリシー']),
      'をご覧ください。',
    ]),
    fields,
    summary,
    el('button', { class: 'button', type: 'submit' }, ['入力内容を確認する']),
    review,
  ]) as HTMLFormElement;
  form.noValidate = true;
  let confirmed = false;
  let sending = false;
  let accepted = false;
  const confirmButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (accepted || sending) return;
    summary.hidden = true;
    clearFields([shopName, industryOther, contactName, email, phone, siteUrl, questions, referrer, notes]);
    industry.clear();
    plan.clear();
    kind.clear();
    const payload: Payload = {
      shop_name: shopName.input.value.trim(),
      industry: industry.value(),
      industry_other: industry.value() === 'その他' ? industryOther.input.value.trim() : '',
      contact_name: contactName.input.value.trim(),
      email: email.input.value.trim(),
      phone: phone.input.value.trim(),
      site_url: cleanConsultSiteUrl(siteUrl.input.value) ?? siteUrl.input.value,
      plan_choice: plan.value(),
      application_kind: kind.value(),
      common_questions: questions.input.value.trim(),
      referrer_name: referrer.input.value.trim(),
      notes: notes.input.value.trim(),
      newsletter_opt_in: newsletter.checked,
      privacy_agreed: agreed.checked,
      turnstile_token: '',
    };
    if (!confirmed) {
      const problem = validate(payload, {
        shopName,
        industry,
        industryOther,
        contactName,
        email,
        phone,
        siteUrl,
        plan,
        kind,
        agreed,
        agreedError,
      });
      if (problem) {
        showProblems(summary, problem);
        return;
      }
      confirmed = true;
      confirmButton.hidden = true;
      const sendButton = el('button', { class: 'button', type: 'submit' }, ['この内容で送信する']) as HTMLButtonElement;
      captcha.replaceChildren();
      review.replaceChildren(
        el('h2', null, ['入力内容の確認']),
        line('お店の名前', payload.shop_name),
        line('業種', payload.industry),
        ...(payload.industry === 'その他' ? [line('業種（その他）', payload.industry_other)] : []),
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
        confirmStatus,
        captcha,
        el('div', { class: 'row' }, [sendButton, backButton()]),
      );
      fields.hidden = true;
      review.hidden = false;
      widget = mountTurnstile(captcha, 'consult');
      const active = widget;
      active.onChange((next) => {
        if (next === 'error') {
          confirmStatus.hidden = false;
          confirmStatus.textContent = TURNSTILE_WIDGET_ERROR_MESSAGE;
          sendButton.disabled = true;
          confirmStatus.scrollIntoView?.({ block: 'center' });
          return;
        }
        if (next === 'ok' && !sending && !accepted) {
          sendButton.disabled = false;
          if (confirmStatus.textContent === TURNSTILE_WAITING_MESSAGE) confirmStatus.hidden = true;
        }
      });
      review.scrollIntoView?.({ block: 'start' });
      return;
    }
    if (!widget || !widget.isFresh()) {
      if (widget && (widget.state() === 'expired' || widget.state() === 'ok')) widget.reset();
      confirmStatus.hidden = false;
      confirmStatus.textContent = TURNSTILE_WAITING_MESSAGE;
      const sendButton = review.querySelector('button[type="submit"]');
      if (sendButton instanceof HTMLButtonElement) sendButton.disabled = true;
      confirmStatus.scrollIntoView?.({ block: 'center' });
      return;
    }
    const ready = widget;
    const sendButton = review.querySelector('button[type="submit"]');
    if (sendButton instanceof HTMLButtonElement) sendButton.disabled = true;
    sending = true;
    confirmStatus.hidden = false;
    confirmStatus.textContent = '送信中…';
    payload.turnstile_token = ready.token();
    const client = createPublicClient(supabaseUrl, anonKey);
    void client.functions.invoke('consult', { body: payload }).then(async (result) => {
      const { data, error } = result;
      const status = httpStatus(result);
      if (!consultAccepted(data, error, status)) {
        sending = false;
        ready.reset();
        const reason = await functionReason(error, data);
        console.warn(`consult status=${status ?? 'unknown'} reason=${reason || 'unknown'}`);
        confirmStatus.hidden = false;
        confirmStatus.textContent = consultFailureMessage(reason);
        if (sendButton instanceof HTMLButtonElement) sendButton.disabled = false;
        confirmStatus.scrollIntoView?.({ block: 'center' });
        return;
      }
      accepted = true;
      sending = false;
      showConsultSuccess(form, payload.shop_name, payload.contact_name);
    });

    function backButton(): HTMLButtonElement {
      const back = el('button', { class: 'button ghost', type: 'button' }, ['入力画面に戻る']) as HTMLButtonElement;
      back.addEventListener('click', () => {
        confirmed = false;
        widget = null;
        captcha.replaceChildren();
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

type Problem = { message: string; field: HTMLElement; error: HTMLElement };

function showProblems(summary: HTMLElement, problems: Problem[]): void {
  const first = problems[0];
  if (!first) return;
  for (const problem of problems) {
    problem.error.hidden = false;
    problem.error.textContent = problem.message;
  }
  summary.hidden = false;
  summary.textContent = first.message;
  first.error.scrollIntoView?.({ block: 'center' });
  first.field.focus();
}

function validate(input: Payload, fields: {
  shopName: Field;
  industry: RadioGroup;
  industryOther: Field;
  contactName: Field;
  email: Field;
  phone: Field;
  siteUrl: Field;
  plan: RadioGroup;
  kind: RadioGroup;
  agreed: HTMLInputElement;
  agreedError: HTMLElement;
}): Problem[] | null {
  const problems: Problem[] = [];
  const add = (ok: boolean, message: string, field: HTMLElement, error: HTMLElement) => {
    if (!ok) problems.push({ message, field, error });
  };
  add(input.shop_name.length > 0, 'お店の名前を入力してください', fields.shopName.input, fields.shopName.error);
  add(Boolean(input.industry), '業種を選んでください', fields.industry.first(), fields.industry.error);
  if (input.industry === 'その他') add(input.industry_other.length > 0, '業種を入力してください', fields.industryOther.input, fields.industryOther.error);
  add(input.contact_name.length > 0, '担当者名を入力してください', fields.contactName.input, fields.contactName.error);
  add(contactOk(input.email), '正しいメールアドレスを入力してください', fields.email.input, fields.email.error);
  add(!input.phone || japanesePhoneOk(input.phone), '電話番号の形式で入力してください（空欄でも送れます）', fields.phone.input, fields.phone.error);
  add(cleanConsultSiteUrl(fields.siteUrl.input.value) !== null, 'http または https で始まるURLを入力してください（空欄でも送れます）', fields.siteUrl.input, fields.siteUrl.error);
  add(Boolean(input.plan_choice), '希望プランを選んでください', fields.plan.first(), fields.plan.error);
  add(Boolean(input.application_kind), '申込の種類を選んでください', fields.kind.first(), fields.kind.error);
  add(input.privacy_agreed, '同意してから送信してください', fields.agreed, fields.agreedError);
  return problems.length > 0 ? problems : null;
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

type Field = { wrap: HTMLElement; input: HTMLInputElement | HTMLTextAreaElement; error: HTMLElement };

type RadioGroup = {
  box: HTMLElement;
  error: HTMLElement;
  value: () => string;
  first: () => HTMLElement;
  clear: () => void;
  onChange: (listener: () => void) => void;
};

function errorLine(): HTMLElement {
  const error = el('p', { class: 'error field-error' });
  error.hidden = true;
  return error;
}

function clearField(target: Field): void {
  target.error.hidden = true;
  target.error.textContent = '';
}

function clearFields(targets: Field[]): void {
  for (const target of targets) clearField(target);
}

function field(name: string, placeholder: string, max: number): Field {
  const input = el('input', { type: 'text', placeholder, maxlength: String(max) }) as HTMLInputElement;
  const error = errorLine();
  return { wrap: el('div', { class: 'field-wrap' }, [el('label', { class: 'field' }, [name, input]), error]), input, error };
}

function area(name: string, placeholder: string, max: number): Field {
  const input = el('textarea', { placeholder, maxlength: String(max) }) as HTMLTextAreaElement;
  const error = errorLine();
  return { wrap: el('div', { class: 'field-wrap' }, [el('label', { class: 'field' }, [name, input]), error]), input, error };
}

function radios(name: string, options: readonly string[], group: string): RadioGroup {
  const inputs = options.map((option) => {
    const input = el('input', { type: 'radio', name: group, value: option }) as HTMLInputElement;
    return { option, input, label: el('label', { class: 'check' }, [input, option]) };
  });
  const error = errorLine();
  return {
    box: el('fieldset', { class: 'stack' }, [el('legend', null, [name]), ...inputs.map((item) => item.label), error]),
    error,
    value: () => inputs.find((item) => item.input.checked)?.option ?? '',
    first: () => inputs[0].input,
    clear: () => {
      error.hidden = true;
      error.textContent = '';
    },
    onChange: (listener) => {
      for (const item of inputs) item.input.addEventListener('change', listener);
    },
  };
}
