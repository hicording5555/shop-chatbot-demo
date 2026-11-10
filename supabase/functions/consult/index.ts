import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';
import {
  OPERATOR_CONTACT_PLACEHOLDER,
  PRODUCTION_ORIGIN,
  contactOk,
  japanesePhoneOk,
  neutralizeFormula,
  parseOrigins,
  turnstileRequired,
  verifyTurnstile,
} from '../_shared/policy.ts';

function allowedOrigins(): string[] {
  return parseOrigins(Deno.env.get('HANDOFF_ALLOWED_ORIGINS'), PRODUCTION_ORIGIN);
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
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}|consult|${ip}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
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

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { ok: false, reason: 'invalid' }, origin);
  }

  const shopName = String(payload.shop_name ?? '').trim();
  const industry = String(payload.industry ?? '').trim();
  const industryOther = String(payload.industry_other ?? '').trim();
  const contactName = String(payload.contact_name ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const phone = String(payload.phone ?? '').trim();
  const siteUrl = String(payload.site_url ?? '').trim();
  const planChoice = String(payload.plan_choice ?? '').trim();
  const applicationKind = String(payload.application_kind ?? '').trim();
  const commonQuestions = String(payload.common_questions ?? '').trim();
  const referrerName = String(payload.referrer_name ?? '').trim();
  const notes = String(payload.notes ?? '').trim();
  const newsletter = payload.newsletter_opt_in === true;
  const agreed = payload.privacy_agreed === true;
  const industries = ['美容室・サロン', '整体院', '整骨院・鍼灸院', '飲食店', 'その他'];
  const plans = ['ライト', '標準', '充実', 'まだ決めていない'];
  const kinds = ['まず話を聞きたい', 'モニターを希望', '通常の申し込み'];

  if (
    shopName.length < 1 || shopName.length > 80
    || !industries.includes(industry)
    || industryOther.length > 80
    || (industry === 'その他' && industryOther.length < 1)
    || contactName.length < 1 || contactName.length > 80
    || email.length < 5 || email.length > 120
    || phone.length > 40
    || siteUrl.length > 300
    || !plans.includes(planChoice)
    || !kinds.includes(applicationKind)
    || commonQuestions.length > 2000
    || referrerName.length > 80
    || notes.length > 2000
    || !agreed
  ) {
    return json(400, { ok: false, reason: 'invalid' }, origin);
  }
  if (!contactOk(email) || (phone && !japanesePhoneOk(phone))) {
    return json(400, { ok: false, reason: 'contact_invalid' }, origin);
  }
  const captcha = await verifyTurnstile({
    required: turnstileRequired(Deno.env.get('TURNSTILE_REQUIRED')),
    secret: Deno.env.get('TURNSTILE_SECRET_KEY')?.trim() ?? '',
    token: typeof payload.turnstile_token === 'string' ? payload.turnstile_token : '',
    remoteIp: clientIp(req),
    action: 'consult',
  });
  if (captcha === 'captcha_failed') return json(403, { ok: false, reason: 'captcha_failed' }, origin);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const inserted = await admin.rpc('accept_consult', {
    shop_name: neutralizeFormula(shopName),
    industry,
    industry_other: neutralizeFormula(industryOther),
    contact_name: neutralizeFormula(contactName),
    email,
    phone: neutralizeFormula(phone),
    site_url: siteUrl,
    plan_choice: planChoice,
    application_kind: applicationKind,
    common_questions: neutralizeFormula(commonQuestions),
    referrer_name: neutralizeFormula(referrerName),
    wants_video: false,
    notes: neutralizeFormula(notes),
    newsletter_opt_in: newsletter,
    ip_hash: await hashIp(clientIp(req), await ipSalt(serviceKey)),
  });
  if (inserted.error) {
    const message = inserted.error.message ?? '';
    const capKind = /rate_limited_global/i.test(message)
      ? 'consult_global'
      : /rate_limited_ip/i.test(message)
        ? 'consult_ip'
        : /rate_limited/i.test(message)
          ? 'consult_global'
          : '';
    if (capKind) await admin.schema('private').from('cap_hits').insert({ kind: capKind });
    const reason = capKind
      ? 'rate_limited'
      : /contact_invalid/i.test(message)
        ? 'contact_invalid'
        : 'invalid';
    const status = reason === 'rate_limited' ? 429 : 400;
    const contact = reason === 'rate_limited' ? { contact: OPERATOR_CONTACT_PLACEHOLDER } : {};
    return json(status, { ok: false, reason, ...contact }, origin);
  }
  return json(200, { ok: true }, origin);
});
