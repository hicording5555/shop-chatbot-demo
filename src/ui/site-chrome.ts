import type { Route } from '../lib/route';
import { corporateAiChatbot, corporateHome } from '../lib/corporate';
import { allowsIndex, shouldNoindex } from '../lib/robots';
import { FOOTER_NOTE } from '../content/service';
import { el } from './dom';

const NAV: [string, string][] = [
  ['/', 'トップ'],
  ['/plans', 'プランと料金'],
  ['/flow', '導入の流れ'],
  ['/faq', 'よくある質問'],
];

/** 通常色のロゴ。縮小したファイルだけを置く。外部URLからは読み込まない。 */
export function arkLogo(): HTMLAnchorElement {
  return el('a', { class: 'brand', href: '/', 'aria-label': 'ARK ホーム' }, [
    el('img', {
      class: 'brand-logo',
      src: '/brand/ark-logo.webp',
      alt: 'ARK',
      width: '600',
      height: '200',
    }),
  ]);
}

export function routeTitle(name: Route['name']): string {
  const titles: Record<Route['name'], string> = {
    landing: 'お店のホームページで、よくある質問に答えます｜ARK',
    plans: 'プランと料金｜ARK',
    flow: '導入の流れ｜ARK',
    faq: 'よくある質問｜ARK',
    consult: '相談・申し込み｜ARK',
    privacy: '個人情報の取り扱い｜ARK',
    legal: '特定商取引法に基づく表記｜ARK',
    terms: '利用規約｜ARK',
    demo: 'プラン別デモ（架空の店）｜ARK',
    widget: 'チャット｜ARK',
    admin: '管理｜ARK',
    reserve: '予約ページの見本｜ARK',
    notfound: 'ページが見つかりません｜ARK',
  };
  return titles[name];
}

export function applyDocumentPolicy(pathname: string, title: string, allowIndex = allowsIndex()): void {
  document.title = title;
  const existing = document.querySelector('meta[name="robots"]');
  if (!shouldNoindex(pathname, allowIndex)) {
    existing?.remove();
    return;
  }
  const meta = existing ?? document.head.appendChild(document.createElement('meta'));
  meta.setAttribute('name', 'robots');
  meta.setAttribute('content', 'noindex, nofollow');
}

function externalLink(href: string, label: string): HTMLAnchorElement {
  return el('a', { href, target: '_blank', rel: 'noopener noreferrer' }, [label]);
}

export function masthead(current: string): HTMLElement {
  const links = NAV.map(([href, label]) => {
    const attrs: Record<string, string> = { href };
    if (href === current) attrs['aria-current'] = 'page';
    return el('a', attrs, [label]);
  });
  const nav = el('nav', { id: 'site-nav', class: 'nav' }, [
    ...links,
    el('a', { class: 'nav-consult', href: '/consult' }, ['相談・申し込み']),
  ]);
  const toggle = el('button', {
    class: 'nav-toggle',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': 'site-nav',
  }, ['メニュー']) as HTMLButtonElement;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  return el('header', { class: 'masthead' }, [
    el('div', { class: 'wrap masthead-inner' }, [
      el('div', { class: 'brand-block' }, [
        arkLogo(),
        el('a', { class: 'corp-link', href: corporateHome(), target: '_blank', rel: 'noopener noreferrer' }, ['コーポレートサイトへ']),
      ]),
      nav,
      el('a', { class: 'button header-cta', href: '/consult' }, ['相談・申し込み']),
      toggle,
    ]),
  ]);
}

export function siteFooter(): HTMLElement {
  return el('footer', { class: 'site-footer' }, [
    el('div', { class: 'wrap footer-inner' }, [
      el('div', { class: 'footer-brand' }, [
        arkLogo(),
        el('p', { class: 'footer-en' }, ['SOFTWARE & DIGITAL SERVICES']),
      ]),
      el('nav', { class: 'footer-nav', 'aria-label': 'フッター' }, [
        el('a', { href: '/legal' }, ['特定商取引法に基づく表記']),
        el('a', { href: '/privacy' }, ['個人情報の取り扱い']),
        el('a', { href: '/terms' }, ['利用規約']),
        externalLink(corporateHome(), 'コーポレートサイト'),
        externalLink(corporateAiChatbot(), 'AI・チャットボット'),
      ]),
      el('p', { class: 'footer-copy' }, ['© 2026 ARK']),
      el('p', { class: 'footer-note' }, [FOOTER_NOTE]),
    ]),
  ]);
}

export function pageShell(current: string, children: (Node | string)[], narrow = false): HTMLElement {
  return el('div', { class: 'page' }, [
    el('a', { class: 'skip', href: '#main' }, ['本文へ移動']),
    masthead(current),
    el('main', { id: 'main', tabindex: '-1', class: narrow ? 'narrow-page' : '' }, children),
    siteFooter(),
  ]);
}
