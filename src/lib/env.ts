export interface PublicEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export type EnvResult =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; missing: string[]; serviceRole: boolean };

const PLACEHOLDERS = new Set(['your-anon-key', 'replace-me', 'changeme', 'anon-key']);

export function readEnv(source: PublicEnv = import.meta.env): EnvResult {
  const url = (source.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = (source.VITE_SUPABASE_ANON_KEY ?? '').trim();
  const missing: string[] = [];
  if (!url) missing.push('VITE_SUPABASE_URL');
  if (!anonKey || PLACEHOLDERS.has(anonKey)) missing.push('VITE_SUPABASE_ANON_KEY');
  const serviceRole = isServiceRoleKey(anonKey);
  if (missing.length > 0 || serviceRole) return { ok: false, missing, serviceRole };
  return { ok: true, url, anonKey };
}

export function isServiceRoleKey(key: string): boolean {
  const parts = key.split('.');
  if (parts.length !== 3) return false;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(padded)) as { role?: string };
    return json.role === 'service_role';
  } catch {
    return false;
  }
}
