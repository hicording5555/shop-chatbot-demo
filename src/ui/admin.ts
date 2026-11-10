import type { SupabaseClient } from '@supabase/supabase-js';
import { containsEfficacyClaim, type Shop } from '../types';
import { mapFaq, mapShop, type HandoffRow } from '../data/api';
import { el } from './dom';

interface FaqDraft {
  id?: string;
  question: string;
  answer: string;
  keywords: string;
  published: boolean;
  sortOrder: number;
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
          message.textContent = 'ログインできませんでした。メールとパスワード、メール確認の設定を見てください。';
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
    el('p', null, ['このアカウントに紐づいたお店のFAQだけを編集できます。']),
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
    for (const faq of faqs) list.append(faqCard(faq, shop, status, client, root));
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
    el('p', null, ['このお店の質問だけが表示されています。他店のデータは読み書きできません。']),
    status,
    editorForm(null, shop, status, client, root),
    el('h2', null, ['登録済みの質問']),
    list,
    el('h2', null, ['スタッフへの引き継ぎ']),
    el('p', { class: 'note' }, ['充実プランのデモから送られた内容です。メールは送信しません。データベースに保存し、ここだけで見ます。']),
    handoffTable(handoffs),
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
  const keywords = el('input', { type: 'text', value: current?.keywords ?? '', placeholder: 'カンマ区切り（任意）' }) as HTMLInputElement;
  const sort = el('input', { type: 'number', min: '0', value: String(current?.sortOrder ?? 0) }) as HTMLInputElement;
  const published = el('input', { type: 'checkbox' }) as HTMLInputElement;
  published.checked = current?.published ?? true;
  const form = el('form', { class: 'stack editor' }, [
    el('h2', null, [current?.id ? '質問を編集' : '質問を追加']),
    el('label', { class: 'field' }, ['質問', question]),
    el('label', { class: 'field' }, ['答え', answer]),
    el('label', { class: 'field' }, ['検索キーワード', keywords]),
    el('label', { class: 'field' }, ['並び順', sort]),
    el('label', { class: 'check' }, [published, '公開する']),
    el('button', { class: 'button', type: 'submit' }, [current?.id ? '更新する' : '追加する']),
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
      question: question.value.trim(),
      answer: answer.value.trim(),
      keywords: keywords.value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 20),
      published: published.checked,
      sort_order: Number(sort.value) || 0,
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
): HTMLElement {
  const body = el('div', { class: 'stack' });
  const card = el('article', { class: 'faq-card' }, [
    el('h3', null, [faq.question]),
    el('p', null, [faq.answer]),
    el('p', { class: 'hint' }, [faq.published ? '公開中' : '非公開', `／並び ${faq.sortOrder}`]),
    el('div', { class: 'row' }, [
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
      button('削除', () => {
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

function handoffTable(rows: HandoffRow[]): HTMLElement {
  if (rows.length === 0) return el('p', null, ['まだ問い合わせはありません。']);
  const table = el('table', { class: 'grid' }, [
    el('thead', null, [
      el('tr', null, [th('日時'), th('お名前'), th('連絡先'), th('質問')]),
    ]),
  ]);
  const tbody = el('tbody', null);
  for (const row of rows) {
    tbody.append(
      el('tr', null, [
        td(new Date(row.created_at).toLocaleString('ja-JP')),
        td(row.customer_name),
        td(row.contact),
        td(row.question),
      ]),
    );
  }
  table.append(tbody);
  return table;
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

function th(text: string): HTMLElement {
  return el('th', null, [text]);
}

function td(text: string): HTMLElement {
  return el('td', null, [text]);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '処理できませんでした。';
}
