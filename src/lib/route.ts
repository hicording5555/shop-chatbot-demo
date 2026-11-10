import type { PlanId } from '../types';

export type Route =
  | { name: 'landing' }
  | { name: 'demo'; plan: PlanId }
  | { name: 'widget'; plan: PlanId }
  | { name: 'admin' }
  | { name: 'notfound' };

const PLANS = new Set<PlanId>(['light', 'standard', 'full']);

export function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'landing' };
  if (path === '/admin') return { name: 'admin' };
  const demo = /^\/demo\/(light|standard|full)$/.exec(path);
  if (demo && PLANS.has(demo[1] as PlanId)) return { name: 'demo', plan: demo[1] as PlanId };
  const widget = /^\/widget\/(light|standard|full)$/.exec(path);
  if (widget && PLANS.has(widget[1] as PlanId)) return { name: 'widget', plan: widget[1] as PlanId };
  return { name: 'notfound' };
}
