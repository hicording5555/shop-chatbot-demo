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

describe('render.yaml stays a free static site', () => {
  const yaml = readFileSync(new URL('../render.yaml', import.meta.url), 'utf8');

  it('publishes dist and does not declare paid resources', () => {
    expect(yaml).toMatch(/runtime:\s*static/);
    expect(yaml).toMatch(/staticPublishPath:\s*\.\/dist/);
    expect(yaml).not.toMatch(/databases:|keyvalue:|type:\s*pserv|type:\s*worker|disk:/);
    expect(yaml).not.toMatch(/plan:\s*(starter|standard|pro|basic)/);
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
    expect(parseRoute('/missing').name).toBe('notfound');
  });
});
