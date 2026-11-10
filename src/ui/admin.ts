import type { SupabaseClient } from '@supabase/supabase-js';
import { containsEfficacyClaim, type Shop } from '../types';
import { mapFaq, mapShop, type HandoffRow } from '../data/api';
import { splitKeywords } from '../lib/keywords';
import { el } from './dom';
import { neutralizeFormula } from '../../supabase/functions/_shared/policy';

interface FaqDraft {
  id?: string;
  question: string;
  answer: string;
  keywords: string;
  published: boolean;
  sortOrder: number;
}

export function mountAdminFixture(root: HTMLElement, shop: Shop, faqs: ReturnType<typeof mapFaq>[], handoffs: HandoffRow[]): void {
  const client = {
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      insert: () => Promise.resolve({ error: null }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    auth: { signOut: () => Promise.resolve() },
  } as unknown as SupabaseClient;
  root.replaceChildren(adminView(client, root, 'owner@example.com', shop, faqs, handoffs));
}

export function mountAdmin(root: HTMLElement, client: SupabaseClient): void {
  root.replaceChildren(el('main', { class: 'sheet narrow' }, [el('p', null, ['確認しています…'])]));
  client.auth
    .getUser()
    .then(({ data, error }) => {
      if (error || !data.user) {
        root.replaceChildren(loginView(client, root));
        return;
      }
      return showShop(root, client, data.user.email ?? '');
    })
    .catch((error: unknown) => {
      root.replaceChildren(el('main', { class: 'sheet narrow' }, [el('p', null, [errorText(error)])]));
    });
}

function loginView(client: SupabaseClient, root: HTMLElement): HTMLElement {
  const email = el('input', { type: 'email', required: 'true', autocomplete: 'username' }) as HTMLInputElement;
  const password = el('input', { type: 'password', required: 'true', autocomplete: 'current-password' }) as HTMLInputElement;
  const message = el('p', { class: 'error', role: 'alert' });
  message.hidden = true;
  const form = el('form', { class: 'stack' }, [
    el('label', { class: 'field' }, ['メールアドレス', email]),
    el('label', { class: 'field' }, ['パスワード', password]),
    message,
    el('button', { class: 'button', type: 'submit' }, ['ログイン']),
  ]) as HTMLFormElement;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    message.hidden = true;
    client.auth
      .signInWithPassword({ email: email.value.trim(), password: password.value })
      .then(({ error }) => {
        if (error) {
          message.hidden = false;
          message.textContent = 'メールアドレスかパスワードが違います。もう一度お確かめください。';
          return;
        }
        mountAdmin(root, client);
      })
      .catch((error: unknown) => {
        message.hidden = false;
        message.textContent = errorText(error);
      });
  });
  return el('main', { class: 'sheet narrow' }, [
    el('p', { class: 'eyebrow' }, ['お店の管理']),
    el('h1', null, ['ログイン']),
    el('p', null, ['ご契約のお店専用です。管理画面の見本は各デモページでご覧いただけます。']),
    form,
    el('p', null, [el('a', { href: '/' }, ['トップへ戻る'])]),
  ]);
}

async function showShop(root: HTMLElement, client: SupabaseClient, email: string): Promise<void> {
  const member = await client.from('shop_members').select('shop_id').limit(1).maybeSingle();
  if (member.error) throw new Error(member.error.message);
  if (!member.data?.shop_id) {
    root.replaceChildren(
      el('main', { class: 'sheet narrow' }, [
        el('h1', null, ['お店が紐づいていません']),
        el('p', null, ['seed_members.sql で、このログインユーザーを shop_members に登録してください。']),
        logoutButton(client, root),
      ]),
    );
    return;
  }
  const shopResult = await client.from('shops').select('*').eq('id', member.data.shop_id).single();
  if (shopResult.error) throw new Error(shopResult.error.message);
  const shop = mapShop(shopResult.data);
  const faqsResult = await client.from('faqs').select('*').order('sort_order');
  if (faqsResult.error) throw new Error(faqsResult.error.message);
  const handoffResult = await client.from('handoff_requests').select('id, customer_name, contact, question, created_at').order('created_at', { ascending: false });
  if (handoffResult.error) throw new Error(handoffResult.error.message);
  root.replaceChildren(
    adminView(client, root, email, shop, (faqsResult.data ?? []).map(mapFaq), (handoffResult.data ?? []) as HandoffRow[]),
  );
}

function adminView(
  client: SupabaseClient,
  root: HTMLElement,
  email: string,
  shop: Shop,
  faqs: ReturnType<typeof mapFaq>[],
  handoffs: HandoffRow[],
): HTMLElement {
  const status = el('p', { class: 'error', role: 'alert' });
  status.hidden = true;
  const list = el('div', { class: 'faq-admin' });
  const redraw = () => {
    list.replaceChildren();
    faqs.forEach((faq, index) => list.append(faqCard(faq, shop, status, client, root, faqs, index)));
  };
  redraw();
  return el('main', { class: 'sheet' }, [
    el('header', { class: 'site-header' }, [
      el('a', { class: 'brand', href: '/' }, ['店ボット']),
      el('p', null, [email]),
      logoutButton(client, root),
    ]),
    el('p', { class: 'eyebrow' }, ['FAQ編集']),
    el('h1', null, [shop.name]),
    el('p', null, ['お客さんによく聞かれる質問と答えを、ここで追加・修正できます。変更はすぐにチャットに反映されます。']),
    status,
    el('h2', null, ['登録済みの質問']),
    list,
    addSlot(shop, status, client, root),
    el('h2', null, ['スタッフへの引き継ぎ']),
    el('p', { class: 'note' }, ['届いた質問の一覧です。メールは送信しません。7日を過ぎた行は自動で消えます。']),
    handoffCards(handoffs, client, root),
  ]);
}

function editorForm(
  current: FaqDraft | null,
  shop: Shop,
  status: HTMLElement,
  client: SupabaseClient,
  root: HTMLElement,
): HTMLFormElement {
  const question = el('input', { type: 'text', maxlength: '200', required: 'true', value: current?.question ?? '' }) as HTMLInputElement;
  const answer = el('textarea', { maxlength: '2000', required: 'true' }, []) as HTMLTextAreaElement;
  answer.value = current?.answer ?? '';
  const keywords = el('input', { type: 'text', value: current?.keywords ?? '', placeholder: '例：ちゅうしゃじょう、車、パーキング' }) as HTMLInputElement;
  const published = el('input', { type: 'checkbox' }) as HTMLInputElement;
  published.checked = current?.published ?? true;
  const actions = el('div', { class: 'row' }, [
    el('button', { class: 'button', type: 'submit' }, [current?.id ? '更新する' : '追加する']),
  ]);
  const cancel = el('button', { class: 'button ghost', type: 'button' }, ['キャンセル']) as HTMLButtonElement;
  cancel.addEventListener('click', () => form.remove());
  actions.append(cancel);
  const form = el('form', { class: 'stack editor' }, [
    el('h2', null, [current?.id ? '質問を編集' : '質問を追加']),
    el('label', { class: 'field' }, ['質問', question]),
    el('label', { class: 'field' }, ['答え', answer]),
    el('label', { class: 'field' }, ['言い換えのことば（任意）', keywords]),
    el('p', { class: 'hint' }, ['お客さんが使いそうな言い方を、読点（、）で区切って入れてください']),
    el('label', { class: 'check' }, [published, 'チャットに表示する']),
    actions,
  ]) as HTMLFormElement;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.hidden = true;
    if (shop.industry === 'seitai' && containsEfficacyClaim(answer.value)) {
      status.hidden = false;
      status.textContent = '整体院の答えに、治る・改善・効くなどの断定は入れられません。';
      return;
    }
    const payload = {
      question: neutralizeFormula(question.value.trim()),
      answer: neutralizeFormula(answer.value.trim()),
      keywords: splitKeywords(keywords.value).map((keyword) => neutralizeFormula(keyword)),
      published: published.checked,
      sort_order: current?.sortOrder ?? 0,
    };
    const request = current?.id
      ? client.from('faqs').update(payload).eq('id', current.id)
      : client.from('faqs').insert({ ...payload, shop_id: shop.id });
    request.then(({ error }) => {
      if (error) {
        status.hidden = false;
        status.textContent = error.message.includes('efficacy')
          ? '整体院の文面として保存できません。効能の断定を外してください。'
          : '保存できませんでした。自分のお店の質問か確認してください。';
        return;
      }
      mountAdmin(root, client);
    });
  });
  return form;
}

function faqCard(
  faq: ReturnType<typeof mapFaq>,
  shop: Shop,
  status: HTMLElement,
  client: SupabaseClient,
  root: HTMLElement,
  faqs: ReturnType<typeof mapFaq>[],
  index: number,
): HTMLElement {
  const body = el('div', { class: 'stack' });
  const up = button('上へ', () => swapFaq(client, root, faq, faqs[index - 1]));
  const down = button('下へ', () => swapFaq(client, root, faq, faqs[index + 1]));
  up.disabled = index === 0;
  down.disabled = index === faqs.length - 1;
  const card = el('article', { class: 'faq-card' }, [
    el('h3', null, [neutralizeFormula(faq.question)]),
    el('p', null, [neutralizeFormula(faq.answer)]),
    el('p', { class: 'hint' }, [faq.published ? 'チャットに表示中' : '非公開（チャットに出ません）']),
    el('div', { class: 'row' }, [
      up,
      down,
      button('編集', () => {
        body.replaceChildren(
          editorForm(
            {
              id: faq.id,
              question: faq.question,
              answer: faq.answer,
              keywords: faq.keywords.join(', '),
              published: faq.published,
              sortOrder: faq.sortOrder,
            },
            shop,
            status,
            client,
            root,
          ),
        );
      }),
      dangerButton('削除', () => {
        if (!window.confirm('この質問を削除しますか？')) return;
        client
          .from('faqs')
          .delete()
          .eq('id', faq.id)
          .then(({ error }) => {
            if (error) {
              status.hidden = false;
              status.textContent = '削除できませんでした。';
              return;
            }
            mountAdmin(root, client);
          });
      }),
    ]),
    body,
  ]);
  return card;
}

function addSlot(shop: Shop, status: HTMLElement, client: SupabaseClient, root: HTMLElement): HTMLElement {
  const slot = el('div', { class: 'stack' });
  const open = el('button', { class: 'button', type: 'button' }, ['＋ 質問を追加']) as HTMLButtonElement;
  open.addEventListener('click', () => {
    slot.replaceChildren(editorForm(null, shop, status, client, root));
  });
  return el('div', { class: 'stack' }, [open, slot]);
}

function swapFaq(
  client: SupabaseClient,
  root: HTMLElement,
  current: ReturnType<typeof mapFaq>,
  neighbor: ReturnType<typeof mapFaq> | undefined,
): void {
  if (!neighbor) return;
  const currentOrder = current.sortOrder;
  const neighborOrder = neighbor.sortOrder;
  const nextCurrent = currentOrder === neighborOrder ? neighborOrder + 1 : neighborOrder;
  client
    .from('faqs')
    .update({ sort_order: nextCurrent })
    .eq('id', current.id)
    .then(({ error }) => {
      if (error) return;
      client.from('faqs').update({ sort_order: currentOrder }).eq('id', neighbor.id).then(() => mountAdmin(root, client));
    });
}

function handoffCards(rows: HandoffRow[], client: SupabaseClient, root: HTMLElement): HTMLElement {
  if (rows.length === 0) return el('p', null, ['まだ問い合わせはありません。']);
  const list = el('div', { class: 'faq-admin' });
  for (const row of rows) {
    const remove = button('削除', () => {
      if (!window.confirm('この問い合わせを削除しますか？')) return;
      client.from('handoff_requests').delete().eq('id', row.id).then(({ error }) => {
        if (error) return;
        mountAdmin(root, client);
      });
    });
    remove.classList.add('danger');
    list.append(
      el('article', { class: 'handoff-card' }, [
        el('p', { class: 'hint' }, [new Date(row.created_at).toLocaleString('ja-JP')]),
        el('p', null, [`${neutralizeFormula(row.customer_name)}　${neutralizeFormula(row.contact)}`]),
        el('p', null, [neutralizeFormula(row.question)]),
        remove,
      ]),
    );
  }
  return list;
}

function logoutButton(client: SupabaseClient, root: HTMLElement): HTMLButtonElement {
  const button = el('button', { class: 'button ghost', type: 'button' }, ['ログアウト']) as HTMLButtonElement;
  button.addEventListener('click', () => {
    client.auth.signOut().finally(() => mountAdmin(root, client));
  });
  return button;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', { type: 'button', class: 'button ghost' }, [label]) as HTMLButtonElement;
  node.addEventListener('click', onClick);
  return node;
}

function dangerButton(label: string, onClick: () => void): HTMLButtonElement {
  const node = button(label, onClick);
  node.classList.add('danger');
  return node;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '処理できませんでした。';
}
