/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_CORPORATE_BASE_URL?: string;
  readonly VITE_ALLOW_INDEX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
