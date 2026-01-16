/**
 * Supabase Admin Client
 * 
 * This client uses the service_role key to bypass RLS policies.
 * ONLY use this on the server-side (API routes, server components).
 * NEVER expose the service_role key to the client.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with service_role privileges
 * This bypasses Row Level Security and should only be used server-side
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'This key is required for server-side operations that bypass RLS. ' +
      'Get it from your Supabase Dashboard > Settings > API > service_role key.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Check if admin client can be created
 * Useful for graceful degradation
 */
export function isAdminClientAvailable(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
