import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { demoFaqs, demoMenu, demoShops } from '../src/data/demo-seed';
import { renderSeedSql } from '../src/data/render-seed';
import { readEnv } from '../src/lib/env';
import { parseRoute } from '../src/lib/route';
import { containsEfficacyClaim, EFFICACY_CLAIM_SOURCE } from '../src/types';

describe('seed and safety copy', () => {
  it('keeps generated seed.sql in sync', () => {
    const file = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
    expect(file).toBe(renderSeedSql());
  });

  it('uses stable shop ids and does not claim efficacy for seitai', () => {
    expect(demoShops.map((shop) => shop.slug)).toEqual(['komorebi', 'lumiere', 'yasuragi']);
    const seitai = demoShops.find((shop) => shop.industry === 'seitai')!;
    const blobs = [
      seitai.name,
      seitai.hours,
      seitai.parking,
      seitai.extra.firstVisit ?? '',
      ...demoMenu.filter((item) => item.shopId === seitai.id).flatMap((item) => [item.name, item.detail]),
      ...demoFaqs.filter((faq) => faq.shopId === seitai.id).map((faq) => faq.answer),
    ];
    for (const blob of blobs) expect(containsEfficacyClaim(blob)).toBe(false);
  });

  it('keeps the efficacy pattern identical in SQL', () => {
    const sql = readFileSync(new URL('../supabase/migrations/20261110120000_init.sql', import.meta.url), 'utf8');
    expect(sql).toContain(EFFICACY_CLAIM_SOURCE);
    expect(sql).toContain('security definer');
    expect(sql).toContain("set search_path = ''");
    expect(sql).not.toContain('user_metadata');
  });
});

type Yaml = string | boolean | Yaml[] | { [key: string]: Yaml };

function parseBlueprint(source: string): Yaml {
  const lines = source.split('\n').map((line) => ({
    indent: line.match(/^ */)?.[0].length ?? 0,
    text: line.trim(),
  })).filter((line) => line.text !== '' && !line.text.startsWith('#'));
  const splitKey = (text: string): { key: string; value: string } | null => {
    const match = /^([^:]+):(.*)$/.exec(text);
    if (!match) return null;
    return { key: match[1].trim(), value: match[2].trim() };
  };
  const scalar = (value: string): string | boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  };
  const parseValue = (at: number, indent: number): { value: Yaml; next: number } => {
    if (lines[at]?.text.startsWith('- ')) {
      const list: Yaml[] = [];
      let index = at;
      while (index < lines.length && lines[index].indent === indent && lines[index].text.startsWith('- ')) {
        const field = splitKey(lines[index].text.slice(2));
        if (!field) {
          list.push(scalar(lines[index].text.slice(2)));
          index += 1;
          continue;
        }
        const item: { [key: string]: Yaml } = {};
        if (field.value !== '') item[field.key] = scalar(field.value);
        else {
          const nested = parseValue(index + 1, lines[index + 1].indent);
          item[field.key] = nested.value;
          index = nested.next;
          list.push(item);
          continue;
        }
        index += 1;
        while (index < lines.length && lines[index].indent > indent) {
          const nestedField = splitKey(lines[index].text);
          if (!nestedField) throw new Error(lines[index].text);
          if (nestedField.value !== '') {
            item[nestedField.key] = scalar(nestedField.value);
            index += 1;
          } else {
            const nested = parseValue(index + 1, lines[index + 1].indent);
            item[nestedField.key] = nested.value;
            index = nested.next;
          }
        }
        list.push(item);
      }
      return { value: list, next: index };
    }
    const map: { [key: string]: Yaml } = {};
    let index = at;
    while (index < lines.length && lines[index].indent === indent) {
      const field = splitKey(lines[index].text);
      if (!field) throw new Error(lines[index].text);
      if (field.value !== '') {
        map[field.key] = scalar(field.value);
        index += 1;
      } else {
        const nested = parseValue(index + 1, lines[index + 1].indent);
        map[field.key] = nested.value;
        index = nested.next;
      }
    }
    return { value: map, next: index };
  };
  const parsed = parseValue(0, lines[0]?.indent ?? 0);
  if (parsed.next !== lines.length) throw new Error('unparsed render.yaml');
  return parsed.value;
}

function headerPathMatches(pattern: string, path: string): boolean {
  if (pattern === '/*') return path.startsWith('/');
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1);
    return path === prefix || path.startsWith(prefix);
  }
  return pattern === path;
}

function lastHeader(headers: Array<{ path?: string; name?: string; value?: string }>, path: string, name: string): string | undefined {
  const matches = headers.filter((header) => header.name === name && header.path && headerPathMatches(header.path, path));
  return matches.at(-1)?.value;
}

describe('render.yaml stays a free static site', () => {
  const yaml = readFileSync(new URL('../render.yaml', import.meta.url), 'utf8');
  const blueprint = parseBlueprint(yaml) as {
    services?: Array<{
      type?: string;
      name?: string;
      runtime?: string;
      plan?: string;
      envVars?: Array<{ key?: string; sync?: boolean; value?: string }>;
      headers?: Array<{ path?: string; name?: string; value?: string }>;
    }>;
    databases?: unknown;
  };

  it('publishes dist and does not declare paid resources', () => {
    expect(yaml).toMatch(/runtime:\s*static/);
    expect(yaml).toMatch(/staticPublishPath:\s*\.\/dist/);
    expect(yaml).not.toMatch(/databases:|keyvalue:|type:\s*pserv|type:\s*worker|disk:/);
    expect(yaml).not.toMatch(/plan:\s*(starter|standard|pro|basic)/);
    expect(blueprint.databases).toBeUndefined();
    expect(blueprint.services).toHaveLength(1);
    expect(blueprint.services?.[0]).toMatchObject({
      type: 'web',
      name: 'shop-chatbot-demo',
      runtime: 'static',
    });
    expect(blueprint.services?.[0]?.plan).toBeUndefined();
  });

  it('keeps the Turnstile site key unset and blocks framing only on admin', () => {
    const service = blueprint.services?.[0];
    const turnstile = service?.envVars?.find((item) => item.key === 'VITE_TURNSTILE_SITE_KEY');
    expect(turnstile).toMatchObject({ sync: false });
    expect(turnstile?.value).toBeUndefined();
    const headers = service?.headers ?? [];
    expect(lastHeader(headers, '/admin', 'Content-Security-Policy')).toBe("frame-ancestors 'none'");
    expect(lastHeader(headers, '/admin/settings', 'Content-Security-Policy')).toBe("frame-ancestors 'none'");
    expect(lastHeader(headers, '/admin', 'X-Frame-Options')).toBe('DENY');
    expect(lastHeader(headers, '/admin/settings', 'X-Frame-Options')).toBe('DENY');
    expect(lastHeader(headers, '/widget/full', 'Content-Security-Policy')).toBe('frame-ancestors *');
    expect(lastHeader(headers, '/widget/full/komorebi', 'Content-Security-Policy')).not.toBe("frame-ancestors 'none'");
    expect(lastHeader(headers, '/widget/full', 'X-Frame-Options')).toBeUndefined();
    expect(lastHeader(headers, '/consult', 'Content-Security-Policy')).toBe('frame-ancestors *');
    expect(headers.some((header) => header.path === '/assets/*' && header.value === 'public, max-age=31536000, immutable')).toBe(true);
    expect(headers.some((header) => header.path === '/embed.js' && header.value === 'public, max-age=300')).toBe(true);
  });
});

describe('env and routes', () => {
  it('explains missing env and rejects a service role key', () => {
    expect(readEnv({ VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' })).toMatchObject({
      ok: false,
      missing: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    });
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const body = btoa(JSON.stringify({ role: 'service_role' }));
    const result = readEnv({
      VITE_SUPABASE_URL: 'https://ofpaiegiilfxloprmcwi.supabase.co',
      VITE_SUPABASE_ANON_KEY: `${header}.${body}.sig`,
    });
    expect(result).toMatchObject({ ok: false, serviceRole: true });
  });

  it('routes the three demos, the widget, and admin', () => {
    expect(parseRoute('/demo/light')).toEqual({ name: 'demo', plan: 'light' });
    expect(parseRoute('/widget/full/')).toEqual({ name: 'widget', plan: 'full' });
    expect(parseRoute('/admin')).toEqual({ name: 'admin' });
    expect(parseRoute('/consult')).toEqual({ name: 'consult' });
    expect(parseRoute('/reserve/komorebi')).toEqual({ name: 'reserve', slug: 'komorebi' });
    expect(parseRoute('/missing').name).toBe('notfound');
  });
});
