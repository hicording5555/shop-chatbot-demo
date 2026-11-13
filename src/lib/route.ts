import type { PlanId } from '../types';

export type Route =
  | { name: 'landing' }
  | { name: 'plans' }
  | { name: 'flow' }
  | { name: 'faq' }
  | { name: 'legal' }
  | { name: 'terms' }
  | { name: 'demo'; plan: PlanId }
  | { name: 'widget'; plan: PlanId; slug?: string }
  | { name: 'admin' }
  | { name: 'consult' }
  | { name: 'privacy' }
  | { name: 'reserve'; slug: string }
  | { name: 'notfound' };

const PLANS = new Set<PlanId>(['light', 'standard', 'full']);

export function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'landing' };
  if (path === '/plans') return { name: 'plans' };
  if (path === '/flow') return { name: 'flow' };
  if (path === '/faq') return { name: 'faq' };
  if (path === '/legal') return { name: 'legal' };
  if (path === '/terms') return { name: 'terms' };
  if (path === '/admin') return { name: 'admin' };
  if (path === '/consult' || path === '/apply') return { name: 'consult' };
  if (path === '/privacy') return { name: 'privacy' };
  const reserve = /^\/reserve\/([a-z0-9-]+)$/.exec(path);
  if (reserve) return { name: 'reserve', slug: reserve[1] };
  const demo = /^\/demo\/(light|standard|full)$/.exec(path);
  if (demo && PLANS.has(demo[1] as PlanId)) return { name: 'demo', plan: demo[1] as PlanId };
  const widget = /^\/widget\/(light|standard|full)(?:\/([a-z0-9-]+))?$/.exec(path);
  if (widget && PLANS.has(widget[1] as PlanId)) return { name: 'widget', plan: widget[1] as PlanId, slug: widget[2] };
  return { name: 'notfound' };
}
