export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ypnoqmkjpvqiddfiapys.supabase.co',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwbm9xbWtqcHZxaWRkZmlhcHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjQ0NzEsImV4cCI6MjA4Nzc0MDQ3MX0.Ucd2KGBt8pRiQlaW1-vh_fpzNiMGhmZKjns2rL0sH4k',
};

// Log at startup so you can verify env vars in browser console
if (typeof window !== 'undefined') {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    console.error(
      '[Supabase] MISSING ENV VARS — auth will not work.',
      'NEXT_PUBLIC_SUPABASE_URL:', supabaseConfig.url ? 'OK' : 'MISSING',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseConfig.anonKey ? 'OK' : 'MISSING',
    );
  }
}
