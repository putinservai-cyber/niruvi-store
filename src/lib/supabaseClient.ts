// Supabase / Cloud SQL Client configuration
// Niruvi Store uses Cloud SQL (PostgreSQL) on the server-side, and this helper provides
// an optional client connector for external Supabase database synchronization if configured.

export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export interface SupabaseConfig {
  isConfigured: boolean;
  url: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    isConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    url: SUPABASE_URL,
  };
}
