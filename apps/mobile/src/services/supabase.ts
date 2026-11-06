import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};
const supabaseUrl = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Congregation mobile app uses anon key only
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Register device for push notifications via security definer RPC
 */
export async function registerDeviceRpc(
  token: string,
  platform: 'android' | 'ios',
  language: 'en' | 'ta'
): Promise<void> {
  const { error } = await supabase.rpc('register_device', {
    token,
    platform,
    language,
  });

  if (error) {
    console.warn('register_device RPC error:', error.message);
  }
}

/**
 * Unregister device via security definer RPC
 */
export async function unregisterDeviceRpc(token: string): Promise<void> {
  const { error } = await supabase.rpc('unregister_device', {
    token,
  });

  if (error) {
    console.warn('unregister_device RPC error:', error.message);
  }
}
