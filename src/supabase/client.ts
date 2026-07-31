'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const url = supabaseConfig.url;
    const key = supabaseConfig.anonKey;

    if (!url || !key) {
      console.error(
        '[Supabase] Missing environment variables!',
        `NEXT_PUBLIC_SUPABASE_URL=${url ? '(set)' : '(missing)'}`,
        `NEXT_PUBLIC_SUPABASE_ANON_KEY=${key ? '(set)' : '(missing)'}`,
        'Make sure these are set in .env locally or apphosting.yaml for deployment.'
      );
    }

    supabaseInstance = createClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    );
  }
  return supabaseInstance;
}
