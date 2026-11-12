import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validates whether Supabase environment variables are present and not default placeholders
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.trim() !== '' &&
  supabaseKey.trim() !== '' &&
  !supabaseUrl.includes('your_supabase_url') &&
  !supabaseKey.includes('your_supabase_anon_key') &&
  supabaseUrl.startsWith('http')
);

// Fallback dummy URL/Key to avoid client initialization crash if unconfigured
const clientUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured ? supabaseKey : 'placeholder-key';

export const supabase = createClient(clientUrl, clientKey);
