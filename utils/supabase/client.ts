import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://guogeighrvlukxvwzbsb.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_0eMAlmlhu6vSQil6A-3jhA_7ffFzE9a";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
