export function isAdminPath(pathname: string): boolean {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  return path === '/admin' || path.startsWith('/admin/');
}

export interface FrameView {
  top: { location: { href: string } } | null;
  readonly self: object;
  readonly location: { href: string };
}

/** 管理画面だけ、フレーム内なら描画しない。他のパスは iframe のまま使える。 */
export function enforceAdminFrame(pathname: string, view: FrameView): 'allow' | 'deny' {
  if (!isAdminPath(pathname)) return 'allow';
  let framed = false;
  try {
    framed = view.top == null || view.top !== view.self;
  } catch {
    framed = true;
  }
  if (!framed) return 'allow';
  try {
    if (view.top) view.top.location = view.location;
  } catch {
    /* 親が別オリジンだと代入できない。 */
  }
  return 'deny';
}
