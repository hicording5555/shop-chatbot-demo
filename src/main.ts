import { createAdminClient } from './lib/supabase';
import { readEnv } from './lib/env';
import { enforceAdminFrame } from './lib/admin-frame';
import { parseRoute } from './lib/route';
import { mountAdmin, mountAdminFixture } from './ui/admin';
import { consultView, missingEnvView, mountDemo, mountReserve, notFoundView, privacyView } from './ui/pages';
import { faqView, flowView, landingView, legalView, plansView, termsView } from './ui/service-pages';
import { applyDocumentPolicy, routeTitle } from './ui/site-chrome';
import './styles.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('missing #app');

function framedAdminNotice(href: string): HTMLElement {
  const main = document.createElement('main');
  main.className = 'sheet narrow';
  const paragraph = document.createElement('p');
  paragraph.textContent = '管理画面は埋め込みでは表示できません。新しいタブで開いてください。';
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = '新しいタブで開く';
  main.append(paragraph, link);
  return main;
}

function render(): void {
  if (!app) return;
  const route = parseRoute(window.location.pathname);
  applyDocumentPolicy(window.location.pathname, routeTitle(route.name));
  if (enforceAdminFrame(window.location.pathname, window) === 'deny') {
    const href = window.location.pathname + window.location.search + window.location.hash;
    app.replaceChildren(framedAdminNotice(href || '/admin'));
    document.documentElement.classList.remove('admin-lock');
    return;
  }
  document.documentElement.classList.remove('admin-lock');
  const env = readEnv();
  const fixture = import.meta.env.DEV && new URLSearchParams(window.location.search).has('fixture');
  document.body.classList.toggle('widget', route.name === 'widget');
  if (fixture && (route.name === 'demo' || route.name === 'widget' || route.name === 'admin')) {
    void import('./data/demo-seed').then(({ demoFaqs, demoMenu, demoShops }) => {
      if (route.name === 'admin') {
        const shop = demoShops.find((item) => item.industry === 'seitai');
        if (!shop || !app) return;
        mountAdminFixture(
          app,
          shop,
          demoFaqs.filter((item) => item.shopId === shop.id),
          [],
        );
        return;
      }
      if (!app) return;
      const url = env.ok ? env.url : 'http://127.0.0.1:54321';
      const key = env.ok ? env.anonKey : 'fixture-anon-key';
      mountDemo(
        app,
        route.plan,
        url,
        key,
        route.name === 'widget',
        {
          shops: demoShops,
          faqs: demoFaqs,
          menu: demoMenu,
        },
        route.name === 'widget' ? route.slug : undefined,
      );
    });
    return;
  }
  if (route.name === 'landing') {
    app!.replaceChildren(landingView());
    return;
  }
  if (route.name === 'plans') {
    app!.replaceChildren(plansView());
    return;
  }
  if (route.name === 'flow') {
    app!.replaceChildren(flowView());
    return;
  }
  if (route.name === 'faq') {
    app!.replaceChildren(faqView());
    return;
  }
  if (route.name === 'legal') {
    app!.replaceChildren(legalView());
    return;
  }
  if (route.name === 'terms') {
    app!.replaceChildren(termsView());
    return;
  }
  if (route.name === 'notfound') {
    app!.replaceChildren(notFoundView());
    return;
  }
  if (route.name === 'consult') {
    app.replaceChildren(consultView(env.ok ? env.url : '', env.ok ? env.anonKey : '', window.location.search));
    return;
  }
  if (route.name === 'privacy') {
    app.replaceChildren(privacyView());
    return;
  }
  if (!env.ok) {
    app!.replaceChildren(missingEnvView(env.missing, env.serviceRole));
    return;
  }
  if (route.name === 'reserve') {
    mountReserve(app!, route.slug, env.url, env.anonKey);
    return;
  }
  if (route.name === 'admin') {
    mountAdmin(app!, createAdminClient(env.url, env.anonKey));
    return;
  }
  mountDemo(app!, route.plan, env.url, env.anonKey, route.name === 'widget', undefined, route.name === 'widget' ? route.slug : undefined);
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return;
  const linkTarget = link.getAttribute('target');
  if (linkTarget === '_blank' || linkTarget === '_top') return;
  event.preventDefault();
  const url = new URL(href, window.location.href);
  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  render();
  const id = url.hash.replace(/^#/, '');
  if (id) document.getElementById(id)?.scrollIntoView();
  else window.scrollTo(0, 0);
});

window.addEventListener('popstate', () => {
  render();
  const id = window.location.hash.replace(/^#/, '');
  if (id) document.getElementById(id)?.scrollIntoView();
});
render();
