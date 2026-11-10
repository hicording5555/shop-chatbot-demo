import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {
  PRODUCTION_ORIGIN,
  contactOk,
  handoffPublicContacts,
  parseOrigins,
  turnstileRequired,
  verifyTurnstile,
} from '../_shared/policy.ts';

function allowedOrigins(): string[] {
  return parseOrigins(Deno.env.get('HANDOFF_ALLOWED_ORIGINS'), PRODUCTION_ORIGIN);
}

async function ipSalt(serviceKey: string): Promise<string> {
  const configured = Deno.env.get('HANDOFF_IP_SALT')?.trim();
  if (configured) return configured;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(serviceKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('handoff-ip-salt-v1'));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function corsHeaders(origin: string): HeadersInit {
  const allowed = allowedOrigins();
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function clientIp(req: Request): string {
  const cloudflare = req.headers.get('cf-connecting-ip')?.trim();
  if (cloudflare) return cloudflare;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}|${ip}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(status: number, body: unknown, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json(405, { ok: false, reason: 'invalid' }, origin);
  if (!origin || !allowedOrigins().includes(origin)) return json(403, { ok: false, reason: 'invalid' }, origin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json(500, { ok: false, reason: 'invalid' }, origin);
  const salt = await ipSalt(serviceKey);

  let payload: { shop_id?: string; customer_name?: string; contact?: string; question?: string; turnstile_token?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { ok: false, reason: 'invalid' }, origin);
  }

  const shopId = payload.shop_id ?? '';
  const customerName = (payload.customer_name ?? '').trim();
  const contact = (payload.contact ?? '').trim();
  const question = (payload.question ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(shopId) || customerName.length < 1 || customerName.length > 80 || contact.length < 5 || contact.length > 120 || question.length < 1 || question.length > 1000) {
    return json(400, { ok: false, reason: 'invalid' }, origin);
  }
  if (!contactOk(contact)) return json(400, { ok: false, reason: 'contact_invalid' }, origin);
  const captcha = await verifyTurnstile({
    required: turnstileRequired(Deno.env.get('TURNSTILE_REQUIRED')),
    secret: Deno.env.get('TURNSTILE_SECRET_KEY')?.trim() ?? '',
    token: payload.turnstile_token,
    remoteIp: clientIp(req),
    action: 'handoff',
  });
  if (captcha === 'captcha_failed') return json(403, { ok: false, reason: 'captcha_failed' }, origin);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const shop = await admin.from('shops').select('id, plan, published, phone, email').eq('id', shopId).maybeSingle();
  const contacts = handoffPublicContacts(shop.data);
  if (shop.error || !shop.data || shop.data.published !== true || shop.data.plan !== 'full') {
    return json(403, { ok: false, reason: 'unavailable' }, origin);
  }

  const ipHash = await hashIp(clientIp(req), salt);
  const inserted = await admin.rpc('accept_handoff', {
    target_shop: shopId,
    customer_name: customerName,
    contact,
    question,
    ip_hash: ipHash,
  });
  if (inserted.error) {
    const message = inserted.error.message ?? '';
    const capKind = /rate_limited_shop/i.test(message)
      ? 'handoff_shop'
      : /rate_limited_ip/i.test(message)
        ? 'handoff_ip'
        : /rate[_ ]limited/i.test(message)
          ? 'handoff_shop'
          : '';
    if (capKind) await admin.schema('private').from('cap_hits').insert({ kind: capKind });
    const reason = capKind
      ? 'rate_limited'
      : /contact_invalid/i.test(message)
        ? 'contact_invalid'
        : /unavailable/i.test(message)
          ? 'unavailable'
          : 'invalid';
    const status = reason === 'rate_limited' ? 429 : reason === 'unavailable' ? 403 : 400;
    return json(status, { ok: false, reason, ...contacts }, origin);
  }
  return json(200, { ok: true }, origin);
});
