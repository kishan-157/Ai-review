import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://guogeighrvlukxvwzbsb.supabase.co';

const supabaseKey =
  (typeof process !== 'undefined' &&
    (process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  'sb_publishable_0eMAlmlhu6vSQil6A-3jhA_7ffFzE9a';

export const supabase = createClient(supabaseUrl, supabaseKey);
