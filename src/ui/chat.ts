import type { Catalog, Industry, PlanId } from '../types';
import { PLAN_LABEL } from '../types';
import { insertHandoff } from '../data/api';
import { apply, start, type BotMessage, type ChatState } from '../lib/flow';
import { el, safeHref } from './dom';

interface TranscriptItem {
  role: 'user' | 'bot';
  text?: string;
  bot?: BotMessage;
}

export function mountChat(
  root: HTMLElement,
  options: {
    plan: PlanId;
    catalog: Catalog;
    supabaseUrl: string;
    anonKey: string;
    onIndustry?: (industry: Industry | null) => void;
  },
): void {
  const opened = start(options.plan);
  let state: ChatState = opened.state;
  const items: TranscriptItem[] = [{ role: 'bot', bot: opened.bot }];

  const log = el('div', { class: 'log', role: 'log', 'aria-live': 'polite' });
  const form = el('form', { class: 'composer' });
  const input = el('input', {
    class: 'composer-input',
    type: 'text',
    maxlength: '1000',
    placeholder: 'ご質問を入力してください',
    'aria-label': 'ご質問',
  }) as HTMLInputElement;
  const send = el('button', { class: 'send', type: 'submit' }, ['送信']);
  form.append(input, send);

  const headerName = el('p', { class: 'chat-shop' }, ['業種を選んでください']);
  const shell = el('section', { class: 'chat', 'aria-label': 'チャット' }, [
    el('header', { class: 'chat-head' }, [
      el('p', { class: 'chat-kicker' }, [`${PLAN_LABEL[options.plan]}プラン`]),
      headerName,
    ]),
    log,
    form,
  ]);
  root.replaceChildren(shell);

  const paint = () => {
    headerName.textContent = shopName(state, options.catalog);
    log.replaceChildren();
    for (const item of items) {
      log.append(item.role === 'user' ? userBubble(item.text ?? '') : botBubble(item.bot!));
    }
    const pending = state.mode === 'handoff-form';
    form.hidden = pending;
    log.scrollTop = log.scrollHeight;
    options.onIndustry?.(state.industry);
  };

  const act = (run: () => void) => {
    run();
    paint();
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value;
    input.value = '';
    const turn = apply(state, { type: 'text', text }, options.catalog);
    state = turn.state;
    if (turn.userText) items.push({ role: 'user', text: turn.userText });
    items.push({ role: 'bot', bot: turn.bot });
    paint();
  });

  paint();

  function actButton(id: string): void {
    const turn = apply(state, { type: 'button', id }, options.catalog);
    state = turn.state;
    if (turn.userText) items.push({ role: 'user', text: turn.userText });
    items.push({ role: 'bot', bot: turn.bot });
  }

  async function actHandoff(draft: { name: string; contact: string; question: string }, host: HTMLElement): Promise<void> {
    const turn = apply(state, { type: 'handoff', draft }, options.catalog);
    if (!turn.effect) {
      state = turn.state;
      items.push({ role: 'bot', bot: turn.bot });
      paint();
      return;
    }
    host.replaceChildren(el('p', { class: 'hint' }, ['送信しています…']));
    try {
      await insertHandoff(options.supabaseUrl, options.anonKey, turn.effect.input);
      state = turn.state;
      items.push({ role: 'bot', bot: turn.bot });
      paint();
    } catch (error) {
      const message = handoffErrorText(error);
      items.push({
        role: 'bot',
        bot: {
          paragraphs: [message],
          buttons: [{ id: 'handoff:no', label: 'いいえ（メニューに戻る）' }],
          links: [],
          menu: [],
          form: true,
        },
      });
      state = { ...state, mode: 'handoff-form' };
      paint();
    }
  }

  function botBubble(message: BotMessage): HTMLElement {
    const bubble = el('div', { class: 'bubble bot' });
    for (const paragraph of message.paragraphs) bubble.append(el('p', null, [paragraph]));
    if (message.menu.length) {
      const table = el('ul', { class: 'menu-list' });
      for (const line of message.menu) {
        const detail = line.detail ? `／${line.detail}` : '';
        table.append(el('li', null, [`${line.name}　${line.priceText}${detail}`]));
      }
      bubble.append(table);
    }
    if (message.links.length) {
      const links = el('div', { class: 'link-row' });
      for (const link of message.links) {
        const href = safeHref(link.href);
        if (!href) continue;
        links.append(el('a', { href, target: '_blank', rel: 'noreferrer' }, [link.label]));
      }
      bubble.append(links);
    }
    if (message.buttons.length) {
      const row = el('div', { class: 'choice-row' });
      for (const button of message.buttons) {
        const node = el('button', { type: 'button', class: 'choice' }, [button.label]);
        node.addEventListener('click', () => act(() => actButton(button.id)));
        row.append(node);
      }
      bubble.append(row);
    }
    if (message.form) bubble.append(handoffForm(actHandoff));
    return bubble;
  }
}

function handoffForm(
  submit: (draft: { name: string; contact: string; question: string }, host: HTMLElement) => Promise<void>,
): HTMLFormElement {
  const name = el('input', { type: 'text', name: 'name', maxlength: '80', required: 'true', placeholder: 'お名前' }) as HTMLInputElement;
  const contact = el('input', { type: 'text', name: 'contact', maxlength: '120', required: 'true', placeholder: 'メールまたは電話' }) as HTMLInputElement;
  const question = el('textarea', { name: 'question', maxlength: '1000', required: 'true', placeholder: '質問内容' }) as HTMLTextAreaElement;
  const button = el('button', { type: 'submit', class: 'send' }, ['この内容で送る']);
  const form = el('form', { class: 'handoff' }, [
    label('お名前', name),
    label('連絡先', contact),
    label('質問内容', question),
    button,
  ]) as HTMLFormElement;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void submit({ name: name.value, contact: contact.value, question: question.value }, form);
  });
  return form;
}

function label(text: string, field: HTMLElement): HTMLElement {
  return el('label', { class: 'field' }, [text, field]);
}

function userBubble(text: string): HTMLElement {
  return el('div', { class: 'bubble user' }, [el('p', null, [text])]);
}

function shopName(state: ChatState, catalog: Catalog): string {
  const shop = catalog.shops.find((item) => item.industry === state.industry);
  return shop?.name ?? '業種を選んでください';
}

function handoffErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/too many requests/i.test(message)) return 'ただいま送信が集中しています。しばらくしてからお試しください。';
  if (/23514|check constraint|constraint/i.test(message)) return '入力内容をご確認ください。連絡先はメールか電話番号です。';
  return '送信できませんでした。時間をおいてもう一度お試しください。';
}
