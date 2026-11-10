import { isServiceRoleKey } from './env';

const JWT = /eyJ[A-Za-z0-9_+/=-]+\.[A-Za-z0-9_+/=-]+\.[A-Za-z0-9_+/=-]+/g;

export function findSecretFindings(text: string): string[] {
  const findings: string[] = [];
  const secretPrefix = `sb_${'secret_'}`;
  if (text.includes(secretPrefix)) findings.push('supabase secret api key');
  for (const token of text.match(JWT) ?? []) {
    if (isServiceRoleKey(token)) findings.push('service_role jwt');
  }
  return findings;
}
