/**
 * Safe Supabase Client Creation
 * 
 * This module provides a safe way to create Supabase clients in client components
 * that prevents prerendering errors during build.
 */

import { useMemo } from 'react';
import { createClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Hook to safely create Supabase client in client components
 * Only creates the client in the browser, not during build/prerendering
 */
export function useSafeSupabaseClient() {
  return useMemo(() => {
    // Only create client in browser, not during build
    if (typeof window === 'undefined') return null;
    
    try {
      return createClient();
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      return null;
    }
  }, []);
}

/**
 * Type guard to check if client is available
 */
export function isClientAvailable(
  client: SupabaseClient | null
): client is SupabaseClient {
  return client !== null;
}
