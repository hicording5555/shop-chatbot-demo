import type { PlanId } from '../types';

export type Route =
  | { name: 'landing' }
  | { name: 'demo'; plan: PlanId }
  | { name: 'widget'; plan: PlanId }
  | { name: 'admin' }
  | { name: 'consult' }
  | { name: 'reserve'; slug: string }
  | { name: 'notfound' };

const PLANS = new Set<PlanId>(['light', 'standard', 'full']);

export function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'landing' };
  if (path === '/admin') return { name: 'admin' };
  if (path === '/consult') return { name: 'consult' };
  const reserve = /^\/reserve\/([a-z0-9-]+)$/.exec(path);
  if (reserve) return { name: 'reserve', slug: reserve[1] };
  const demo = /^\/demo\/(light|standard|full)$/.exec(path);
  if (demo && PLANS.has(demo[1] as PlanId)) return { name: 'demo', plan: demo[1] as PlanId };
  const widget = /^\/widget\/(light|standard|full)$/.exec(path);
  if (widget && PLANS.has(widget[1] as PlanId)) return { name: 'widget', plan: widget[1] as PlanId };
  return { name: 'notfound' };
}
