import type { HandoffInput } from '../types';

export interface HandoffDraft {
  name: string;
  contact: string;
  question: string;
}

export function normalizeContact(contact: string): string {
  return contact
    .trim()
    .normalize('NFKC')
    .replace(/[‐‑‒–—−ー－]/g, '-');
}

export function isEmail(contact: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact);
}

export function isPhone(contact: string): boolean {
  if (!/^[0-9+()（）\s-]+$/.test(contact)) return false;
  const digits = contact.replace(/[^0-9]/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function validateHandoff(
  shopId: string,
  draft: HandoffDraft,
): { ok: true; value: HandoffInput } | { ok: false; message: string } {
  const customerName = draft.name.trim().normalize('NFKC');
  const contact = normalizeContact(draft.contact);
  const question = draft.question.trim().normalize('NFKC');
  if (customerName.length < 1 || customerName.length > 80) {
    return { ok: false, message: 'お名前は1〜80文字で入力してください。' };
  }
  if (!isEmail(contact) && !isPhone(contact)) {
    return {
      ok: false,
      message: '連絡先はメールアドレスか、数字が10〜15桁の電話番号で入力してください。',
    };
  }
  if (question.length < 1 || question.length > 1000) {
    return { ok: false, message: '質問内容は1〜1000文字で入力してください。' };
  }
  return { ok: true, value: { shopId, customerName, contact, question } };
}
