// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { demoFaqs, demoMenu, demoShops } from '../src/data/demo-seed';
import { mountDemo, notFoundView, privacyView } from '../src/ui/pages';

describe('widget empty state', () => {
  it('links to the demo top when the shop slug is unknown', () => {
    document.body.classList.add('widget');
    const root = document.createElement('div');
    mountDemo(root, 'full', 'http://127.0.0.1:54321', 'fixture-anon-key', true, {
      shops: demoShops,
      faqs: demoFaqs,
      menu: demoMenu,
    }, 'missing-shop');
    const notFound = notFoundView();
    expect(document.body.classList.contains('widget')).toBe(false);
    expect(root.querySelector('main')?.className).toBe(notFound.className);
    expect(root.textContent).toContain('お店のデータがありません');
    const link = root.querySelector('a');
    expect(link?.className).toBe(notFound.querySelector('a')?.className);
    expect(link?.getAttribute('href')).toBe('/');
    expect(link?.textContent).toBe('デモのトップへ');
  });
});

describe('privacy copy', () => {
  it('describes IP and browser data, and the longer send-count retention', () => {
    const view = privacyView();
    const collected = Array.from(view.querySelectorAll('h2')).find((heading) => heading.textContent === '取得する情報');
    expect(collected?.nextElementSibling?.textContent).toContain('IPアドレス');
    expect(collected?.nextElementSibling?.textContent).toContain('ブラウザ情報（User-Agent等）');
    expect(collected?.nextElementSibling?.textContent).toContain('Supabase のアクセスログ');
    expect(collected?.nextElementSibling?.textContent).toContain('Cloudflare Turnstile');
    expect(view.textContent).toContain('最長で約2日');
  });
});
