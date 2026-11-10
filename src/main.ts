import { createAdminClient } from './lib/supabase';
import { readEnv } from './lib/env';
import { parseRoute } from './lib/route';
import { mountAdmin } from './ui/admin';
import { landingView, missingEnvView, mountDemo, notFoundView } from './ui/pages';
import './styles.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('missing #app');

function render(): void {
  const env = readEnv();
  const route = parseRoute(window.location.pathname);
  document.body.classList.toggle('widget', route.name === 'widget');
  if (!env.ok) {
    app!.replaceChildren(missingEnvView(env.missing, env.serviceRole));
    return;
  }
  if (route.name === 'landing') {
    app!.replaceChildren(landingView());
    return;
  }
  if (route.name === 'notfound') {
    app!.replaceChildren(notFoundView());
    return;
  }
  if (route.name === 'admin') {
    mountAdmin(app!, createAdminClient(env.url, env.anonKey));
    return;
  }
  mountDemo(app!, route.plan, env.url, env.anonKey, route.name === 'widget');
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return;
  if (link.getAttribute('target') === '_blank') return;
  event.preventDefault();
  window.history.pushState({}, '', href);
  render();
});

window.addEventListener('popstate', render);
render();
