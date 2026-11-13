// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { demoFaqs, demoMenu, demoShops } from '../src/data/demo-seed';
import { DEMO_INDUSTRIES, SERVICE_PLANS, yen } from '../src/content/service';
import { corporateAiChatbot, corporateHome } from '../src/lib/corporate';
import { parseRoute } from '../src/lib/route';
import { NOINDEX_PREFIXES, shouldNoindex } from '../src/lib/robots';
import { mountDemo } from '../src/ui/pages';
import { consultView } from '../src/ui/pages';
import { faqView, flowView, landingView, legalView, plansView, termsView } from '../src/ui/service-pages';
import { privacyView } from '../src/ui/pages';
import { applyDocumentPolicy } from '../src/ui/site-chrome';

const BANNED = [
  '24時間ボタンひとつで',
  '間違った案内をする心配がありません',
  '24時間対応',
  'その場で必ず答える',
  '取りこぼし',
  '確実に',
  '効率が何倍',
  '電話が半分',
  '売上が上がる',
  '予約が増える',
  '必殺',
  'No.1',
  '業界初',
  '今だけ',
  '通常価格',
  '年間',
  '治る',
  '改善する',
  '効果がある',
  'おすすめ',
];

describe('signup site', () => {
  it('keeps the top sections in order, with tax-inclusive prices and one lazy widget', () => {
    const view = landingView();
    const headings = Array.from(view.querySelectorAll('h1, h2')).map((node) => node.textContent);
    expect(headings).toEqual([
      'お店のホームページで、よくある質問に答えます',
      '同じ質問が、くり返し届くことがあります',
      '3つのプランから選べます',
      '実際に触って、動きを確かめてください',
      '相談から導入までの流れ',
      'よくある質問',
      '相談も、Webだけで進められます',
    ]);
    expect(view.textContent).toContain('美容室・サロン、整体院向け　ホームページ用チャット');
    expect(view.textContent).not.toContain('飲食店・美容室・整体院');
    const industries = Array.from(view.querySelectorAll('[aria-label="業種"] button')).map((node) => node.textContent);
    expect(industries).toEqual(['美容室・サロン', '整体院', '飲食店']);
    for (const tab of DEMO_INDUSTRIES) {
      expect(demoShops.find((shop) => shop.industry === tab.id)?.slug).toBe(tab.slug);
    }
    const logos = Array.from(view.querySelectorAll('img'));
    expect(logos.length).toBeGreaterThan(0);
    for (const logo of logos) {
      expect(logo.getAttribute('alt')).toBe('ARK');
      expect(logo.getAttribute('src')).toBe('/brand/ark-logo.webp');
    }
    expect(view.querySelectorAll('a[aria-label="ARK ホーム"]')).toHaveLength(2);
    for (const plan of SERVICE_PLANS) {
      expect(plan.initialTaxIn).toBe(Math.round(plan.initialTaxEx * 1.1));
      expect(plan.monthlyTaxIn).toBe(Math.round(plan.monthlyTaxEx * 1.1));
      expect(view.textContent).toContain(`${yen(plan.initialTaxIn)}（税込）`);
      expect(view.textContent).toContain(`税別 ${yen(plan.initialTaxEx)}`);
      expect(view.textContent).toContain(`${yen(plan.monthlyTaxIn)}（税込）`);
      expect(view.textContent).toContain(`税別 ${yen(plan.monthlyTaxEx)}`);
    }
    expect(view.textContent).toContain('デモで最初に表示するプラン');
    expect(view.textContent).not.toContain('おすすめ');
    const frames = view.querySelectorAll('iframe');
    expect(frames).toHaveLength(1);
    expect(frames[0]?.getAttribute('loading')).toBe('lazy');
    expect(frames[0]?.getAttribute('src')).toBe('/widget/standard/lumiere');
    const expand = view.querySelector('.demo-expand');
    expect(expand?.textContent).toBe('別ページで大きく見る');
    expect(expand?.getAttribute('href')).toBe('/demo/standard');
    expect(frames[0]?.parentElement?.contains(expand)).toBe(false);
    expect(view.textContent).toContain('実在のお店とは関係ありません');
    expect(view.textContent).toContain('いまは未実装です');
    expect(view.textContent).toContain('【〇営業日】');
    expect(view.textContent).toContain('【　】');
    const nav = Array.from(view.querySelectorAll('.nav a')).map((node) => node.getAttribute('href'));
    expect(nav).toEqual(['/', '/plans', '/flow', '/faq']);
    expect(view.querySelector('a[href="/admin"]')).toBeNull();
    expect(view.querySelector('a[href="/pay"]')).toBeNull();
    expect(view.querySelector('a[href^="/widget/"]')).toBeNull();
    expect(view.querySelector('a[href^="/reserve"]')).toBeNull();
    expect(view.querySelector('a[href="/consult"]')).not.toBeNull();
    expect(view.querySelector('a[href="/consult?plan=light"]')).not.toBeNull();
    expect(view.querySelector(`a[href="${corporateHome()}"]`)).not.toBeNull();
    expect(view.querySelector(`a[href="${corporateAiChatbot()}"]`)).not.toBeNull();
    for (const phrase of BANNED) expect(view.textContent).not.toContain(phrase);
  });

  it('switches the single widget when the industry or plan changes', () => {
    const view = landingView();
    const food = Array.from(view.querySelectorAll('[aria-label="業種"] button')).find((node) => node.textContent === '飲食店') as HTMLButtonElement;
    food.click();
    const frame = view.querySelector('iframe');
    expect(view.querySelectorAll('iframe')).toHaveLength(1);
    expect(frame?.getAttribute('src')).toBe('/widget/standard/komorebi');
    const full = Array.from(view.querySelectorAll('[aria-label="プラン"] button')).find((node) => node.textContent === '充実') as HTMLButtonElement;
    full.click();
    expect(view.querySelectorAll('iframe')).toHaveLength(1);
    expect(frame?.getAttribute('src')).toBe('/widget/full/komorebi');
    expect(view.querySelector('.demo-expand')?.getAttribute('href')).toBe('/demo/full');
  });

  it('states current limits on plans, flow, faq, legal, and terms', () => {
    const plans = plansView();
    expect(plans.querySelector('h1')?.textContent).toBe('プランと料金');
    expect(plans.textContent).toContain('相談フォームの送信では決済しません');
    expect(plans.textContent).toContain('実績づくりのためのモニター（店数・期間は【　】）');
    expect(plans.textContent).not.toContain('通常価格');
    const flow = flowView();
    expect(flow.textContent).toContain('いまの手順');
    expect(flow.textContent).toContain('今後の予定（いまは未実装です）');
    expect(flow.textContent).toContain('納期は【　】日');
    expect(flow.textContent).toContain('自動返信メールは送りません');
    const faq = faqView();
    expect(faq.textContent).toContain('予約はチャットで取れますか');
    expect(faq.textContent).toContain('ボットの中では確定しません');
    expect(faq.textContent).toContain('いまは自動返信メールは送りません');
    expect(faq.textContent).toContain('【解約の期限と方法を記入】');
    expect(faq.textContent).toContain('診断や効果の約束は入れません');
    expect(faq.textContent).toContain('今回のフォームでは決済しません');
    const legal = legalView();
    expect(legal.textContent).toContain('特定商取引法に基づく表記');
    expect(legal.textContent).toContain('訪問販売としては構成しません');
    expect(legal.textContent).toContain('【未定】');
    expect(legal.textContent).not.toContain('A案');
    expect(legal.textContent).not.toContain('B案');
    const terms = termsView();
    expect(terms.textContent).toContain('利用規約');
    expect(terms.textContent).toContain('相談・申し込みフォームの送信だけでは、契約は成立しません');
    expect(terms.textContent).toContain('支払いの画面は未実装です');
    expect(terms.textContent).toContain('【未定】');
    const privacy = privacyView();
    expect(privacy.querySelector('h1')?.textContent).toBe('個人情報の取り扱い');
    expect(privacy.textContent).toContain('いまは自動返信メールは送りません');
    expect(privacy.textContent).toContain('通常【〇営業日】以内');
    expect(privacy.textContent).toContain('制定日：【未定】');
    const blob = [plans, flow, faq, legal, terms, privacy].map((node) => node.textContent).join('\n');
    for (const phrase of BANNED) expect(blob).not.toContain(phrase);
  });

  it('keeps the consult URL optional and can preselect a plan', () => {
    const view = consultView('http://127.0.0.1:54321', 'fixture-anon-key', '?plan=standard');
    expect(view.querySelector('h1')?.textContent).toBe('相談・申し込み');
    expect(view.textContent).toContain('ない場合は空欄でも構いません');
    expect(view.textContent).toContain('いまは自動返信メールは送りません');
    expect(view.textContent).toContain('通常【〇営業日】以内');
    const checked = view.querySelector<HTMLInputElement>('input[name="plan"]:checked');
    expect(checked?.value).toBe('標準');
    const newsletter = Array.from(view.querySelectorAll('label')).find((label) => label.textContent?.includes('今後の案内メールを希望する'));
    expect(newsletter?.querySelector('input')?.checked).toBe(false);
  });

  it('marks the full demo page as a fictional shop and does not iframe it', () => {
    const root = document.createElement('div');
    mountDemo(root, 'standard', 'http://127.0.0.1:54321', 'fixture-anon-key', false, {
      shops: demoShops,
      faqs: demoFaqs,
      menu: demoMenu,
    });
    expect(root.querySelector('iframe')).toBeNull();
    expect(root.textContent).toContain('実在のお店とは関係ありません');
    expect(root.querySelector('a[href="/admin"]')).toBeNull();
  });

  it('noindexes admin, widget, reserve, and future shop demos only', () => {
    for (const path of ['/admin', '/admin/settings', '/widget', '/widget/full', '/widget/full/komorebi', '/reserve', '/reserve/komorebi', '/shop-demo', '/shop-demo/lumiere']) {
      expect(shouldNoindex(path)).toBe(true);
    }
    for (const path of ['/', '/plans', '/flow', '/faq', '/consult', '/apply', '/privacy', '/legal', '/terms', '/demo/light', '/demo/standard', '/demo/full']) {
      expect(shouldNoindex(path)).toBe(false);
      expect(parseRoute(path).name).not.toBe('notfound');
    }
    expect(shouldNoindex('/admin-login')).toBe(false);
    const html = readFileSync('index.html', 'utf8');
    expect(html).not.toMatch(/<meta\s+name="robots"\s+content="noindex"\s*\/?>/);
    expect(html).toContain("meta.content = 'noindex, nofollow'");
    for (const prefix of NOINDEX_PREFIXES) expect(html).toContain(`'${prefix}'`);
    const robots = readFileSync('public/robots.txt', 'utf8');
    for (const prefix of NOINDEX_PREFIXES) expect(robots).toContain(`Disallow: ${prefix}`);
    applyDocumentPolicy('/widget/standard', 'チャット｜ARK');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    applyDocumentPolicy('/plans', 'プランと料金｜ARK');
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('does not add payment or mail packages', () => {
    const pkg = readFileSync('package.json', 'utf8');
    expect(pkg).not.toMatch(/stripe|resend/i);
    const css = readFileSync('src/styles.css', 'utf8');
    expect(css).toContain('max-width: 900px');
    expect(css).toContain('overflow-x: auto');
    expect(css).toContain('grid-template-columns: 1fr');
    expect(css).toContain('--demo-min: 280px');
    expect(css).toContain('Noto Sans JP');
    expect(css).not.toMatch(/fonts\.google|montserrat/i);
    const logo = readFileSync('public/brand/ark-logo.webp');
    const mark = readFileSync('public/brand/ark-mark.webp');
    for (const file of [logo, mark]) {
      expect(file.subarray(0, 4).toString()).toBe('RIFF');
      expect(file.subarray(8, 12).toString()).toBe('WEBP');
      expect(file.length).toBeLessThan(80_000);
    }
    expect(readFileSync('public/favicon-32.png').length).toBeGreaterThan(0);
    expect(readFileSync('index.html', 'utf8')).toContain('href="/favicon-32.png"');
    expect(css).toContain('.masthead');
    expect(css).toMatch(/\.masthead\s*\{[^}]*background:\s*var\(--paper\)/);
  });
});
