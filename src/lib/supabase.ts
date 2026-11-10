import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const emptyStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

/** チャットは常に anon。管理画面のログインを混ぜない。 */
export function createPublicClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: emptyStorage,
    },
  });
}

export function createAdminClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'shop-chatbot-admin',
    },
  });
}
