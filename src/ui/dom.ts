export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> | null,
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else node.setAttribute(key, value);
    }
  }
  for (const child of children) node.append(child);
  return node;
}

export function safeHref(href: string): string | null {
  if (/^(https?:\/\/|tel:|mailto:)/i.test(href)) return href;
  return null;
}
