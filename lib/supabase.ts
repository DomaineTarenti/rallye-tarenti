import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Client-side Supabase client (singleton)
// Falls back gracefully if env vars are missing (e.g. during build)
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient("https://placeholder.supabase.co", "placeholder-key");

// Server-side helper — for API routes
export function createServerClient(cookieHeader?: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Add them to your Vercel Environment Variables."
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    },
  });
}
