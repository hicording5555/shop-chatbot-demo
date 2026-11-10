import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { enforceAdminFrame, isAdminPath, type FrameView } from '../src/lib/admin-frame';

function view(options: { same: boolean; compareThrows?: boolean; assignThrows?: boolean }): {
  frame: FrameView;
  assigned: string[];
} {
  const assigned: string[] = [];
  const self = { location: { href: 'https://shop.example/admin?next=1' } };
  let parentLocation: { href: string } = { href: 'https://evil.example/' };
  const parent = {};
  Object.defineProperty(parent, 'location', {
    configurable: true,
    get() {
      return parentLocation;
    },
    set(value: { href: string }) {
      if (options.assignThrows) throw new Error('blocked');
      assigned.push(value.href);
      parentLocation = value;
    },
  });
  const frame = {
    self,
    location: self.location,
    get top() {
      if (options.compareThrows) throw new Error('cross-origin');
      return options.same ? self : parent;
    },
  } as FrameView;
  return { frame, assigned };
}

describe('admin frame guard', () => {
  it('treats only /admin and /admin/* as the admin route', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/')).toBe(true);
    expect(isAdminPath('/admin/settings')).toBe(true);
    expect(isAdminPath('/admin-login')).toBe(false);
    expect(isAdminPath('/demo/standard')).toBe(false);
    expect(isAdminPath('/widget/full')).toBe(false);
  });

  it('leaves widget and demo pages usable inside an iframe', () => {
    const widget = view({ same: false });
    expect(enforceAdminFrame('/widget/standard', widget.frame)).toBe('allow');
    expect(widget.assigned).toEqual([]);
    const demo = view({ same: false });
    expect(enforceAdminFrame('/demo/full', demo.frame)).toBe('allow');
    expect(demo.assigned).toEqual([]);
  });

  it('allows the admin page when it is the top window', () => {
    const top = view({ same: true });
    expect(enforceAdminFrame('/admin', top.frame)).toBe('allow');
    expect(top.assigned).toEqual([]);
  });

  it('does not render admin inside a frame and tries to break out', () => {
    const framed = view({ same: false });
    expect(enforceAdminFrame('/admin/', framed.frame)).toBe('deny');
    expect(framed.assigned).toEqual(['https://shop.example/admin?next=1']);
  });

  it('denies the admin UI when the parent forbids the breakout', () => {
    const blocked = view({ same: false, assignThrows: true });
    expect(enforceAdminFrame('/admin/users', blocked.frame)).toBe('deny');
    const hidden = view({ same: false, compareThrows: true });
    expect(enforceAdminFrame('/admin', hidden.frame)).toBe('deny');
  });

  it('hides admin markup in index.html before the app boots', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain('admin-lock');
    expect(html).toContain("path !== '/admin'");
    expect(html).toContain("path.indexOf('/admin/')");
    expect(html).toContain('window.top');
    expect(html).toContain('__SHOP_ADMIN_FRAMED');
  });
});
