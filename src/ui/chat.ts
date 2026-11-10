import type { Catalog, Industry, PlanId } from '../types';
import { PLAN_LABEL } from '../types';
import { insertHandoff } from '../data/api';
import { apply, start, type BotMessage, type ChatState } from '../lib/flow';
import { el, safeHref } from './dom';

interface TranscriptItem {
  role: 'user' | 'bot';
  text?: string;
  bot?: BotMessage;
  formDone?: boolean;
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
  let lastQuestion = '';
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
      el('p', { class: 'chat-kicker' }, [`${PLAN_LABEL[options.plan]}プラン（デモ）`]),
      headerName,
    ]),
    log,
    form,
  ]);
  root.replaceChildren(shell);

  const paint = () => {
    headerName.textContent = shopName(state, options.catalog);
    closeOldForms();
    log.replaceChildren();
    items.forEach((item, index) => {
      const active = index === items.length - 1;
      log.append(item.role === 'user' ? userBubble(item.text ?? '') : botBubble(item.bot!, active, item.formDone === true));
    });
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
    if (text.trim()) lastQuestion = text.trim();
    if (turn.userText) items.push({ role: 'user', text: turn.userText });
    items.push({ role: 'bot', bot: turn.bot });
    paint();
  });

  paint();

  function closeOldForms(): void {
    items.forEach((item, index) => {
      if (!item.bot?.form) return;
      const isLatest = index === items.length - 1;
      if (!(state.mode === 'handoff-form' && isLatest)) item.formDone = true;
    });
  }

  function actButton(id: string, label: string): void {
    const turn = apply(state, { type: 'button', id, label }, options.catalog);
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
      items.push({
        role: 'bot',
        bot: {
          ...turn.bot,
          paragraphs: [`送信済み：質問内容「${turn.effect.input.question}」`, ...turn.bot.paragraphs],
        },
      });
      paint();
    } catch (error) {
      const shop = options.catalog.shops.find((item) => item.industry === state.industry);
      const message = handoffErrorText(error);
      const paragraphs = [message, 'デモのため返信しません。実在の個人情報は入力しないでください。'];
      const links = shop
        ? [
            { href: `tel:${shop.phone.replace(/-/g, '')}`, label: '電話する' },
            { href: `mailto:${shop.email}`, label: 'メールする' },
          ]
        : [];
      if (shop) paragraphs.push(`電話：${shop.phone}`, `メール：${shop.email}`);
      items.push({
        role: 'bot',
        bot: {
          paragraphs,
          buttons: [{ id: 'handoff:no', label: '送らずに最初の画面に戻る' }],
          links,
          menu: [],
          form: false,
        },
      });
      state = { ...state, mode: 'chat' };
      paint();
    }
  }

  function botBubble(message: BotMessage, active: boolean, formDone: boolean): HTMLElement {
    const bubble = el('div', { class: 'bubble bot' });
    for (const paragraph of message.paragraphs) bubble.append(el('p', null, [paragraph]));
    if (message.menu.length) {
      const table = el('ul', { class: 'menu-list' });
      for (const line of message.menu) {
        const name = el('span', { class: 'menu-name' }, [line.name]);
        const price = el('span', { class: 'menu-price' }, [line.priceText]);
        const row = el('li', null, [name, price]);
        if (line.detail) row.append(el('span', { class: 'menu-detail' }, [line.detail]));
        table.append(row);
      }
      bubble.append(table);
    }
    if (message.links.length) {
      const links = el('div', { class: 'link-row' });
      for (const link of message.links) {
        const href = safeHref(link.href);
        if (!href) continue;
        const attrs: Record<string, string> = { href, class: 'button' };
        if (/^https?:/i.test(href)) {
          attrs.target = '_blank';
          attrs.rel = 'noreferrer';
        }
        links.append(el('a', attrs, [link.label]));
      }
      bubble.append(links);
    }
    if (message.buttons.length) {
      const row = el('div', { class: 'choice-row' });
      for (const button of message.buttons) {
        const node = el('button', { type: 'button', class: 'choice' }, [button.label]) as HTMLButtonElement;
        node.disabled = !active;
        if (active) node.addEventListener('click', () => act(() => actButton(button.id, button.label)));
        row.append(node);
      }
      bubble.append(row);
    }
    if (message.form && active && !formDone) {
      bubble.append(handoffForm(lastQuestion, actHandoff, () => act(() => actButton('handoff:no', '送らずに最初の画面に戻る'))));
    }
    return bubble;
  }
}

function handoffForm(
  questionSeed: string,
  submit: (draft: { name: string; contact: string; question: string }, host: HTMLElement) => Promise<void>,
  onCancel: () => void,
): HTMLFormElement {
  const name = el('input', { type: 'text', name: 'name', maxlength: '80', required: 'true', placeholder: '例：山田 花子' }) as HTMLInputElement;
  const contact = el('input', { type: 'text', name: 'contact', maxlength: '120', required: 'true', placeholder: '例：090-1234-5678 または name@example.com' }) as HTMLInputElement;
  const question = el('textarea', { name: 'question', maxlength: '1000', required: 'true', placeholder: '送りたい質問' }) as HTMLTextAreaElement;
  question.value = questionSeed;
  const button = el('button', { type: 'submit', class: 'send' }, ['この内容で送る']);
  const cancel = el('button', { type: 'button', class: 'text-button' }, ['送らずに最初の画面に戻る']);
  const form = el('form', { class: 'handoff' }, [
    label('お名前', name),
    label('連絡先', contact),
    label('質問内容', question),
    button,
    cancel,
  ]) as HTMLFormElement;
  cancel.addEventListener('click', () => onCancel());
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

export function chatSkeleton(plan: PlanId): HTMLElement {
  return el('section', { class: 'chat', 'aria-busy': 'true', 'aria-label': 'チャット' }, [
    el('header', { class: 'chat-head' }, [
      el('p', { class: 'chat-kicker' }, [`${PLAN_LABEL[plan]}プラン（デモ）`]),
      el('p', { class: 'chat-shop' }, ['チャットを準備しています…']),
    ]),
    el('div', { class: 'log' }, [
      el('div', { class: 'bubble bot skeleton' }, [el('p', null, ['…'])]),
      el('div', { class: 'bubble bot skeleton' }, [el('p', null, ['…'])]),
      el('div', { class: 'bubble bot skeleton' }, [el('p', null, ['…'])]),
    ]),
  ]);
}

function handoffErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'rate_limited' || /too many requests/i.test(message)) {
    return 'ただいま送信が集中しています。お電話かメールでお問い合わせください。';
  }
  if (message === 'invalid') return '入力内容をご確認ください。連絡先はメールか電話番号です。';
  return 'こちらでは受け付けられませんでした。お電話かメールでお問い合わせください。';
}
