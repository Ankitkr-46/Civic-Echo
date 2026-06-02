import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Lazy initialization helper
let supabaseInstance: any = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Warning: Supabase credentials are not fully configured in environment variables. Returning safe mock to prevent build crashes.');
      // Return a safe mock client to prevent Next.js from crashing during build time (e.g. on Vercel)
      return {
        from: () => ({
          select: () => ({ 
            order: () => Promise.resolve({ data: [], error: null }),
            eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) })
          }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
          update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
          delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        }),
      } as any;
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

// Export browser client as a Proxy for lazy runtime evaluation, bypassing compile-time crashes
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    const client = getSupabaseClient();
    return Reflect.get(client, prop);
  }
});

// Server Client (using Service Role for administrative operations)
export const createServerSupabase = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Warning: Supabase credentials are missing on server. Returning mock client for static build generation.');
    return {
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({ data: [] }),
          eq: () => ({ 
            order: () => Promise.resolve({ data: [], error: null }), 
            single: () => Promise.resolve({ data: null, error: null }), 
            maybeSingle: () => Promise.resolve({ data: null, error: null }) 
          }),
        }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      }),
    } as any;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
