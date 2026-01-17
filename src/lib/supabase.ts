import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const externalForumsUrl = import.meta.env.VITE_EXTERNAL_FORUMS_URL;
const externalForumsAnonKey = import.meta.env.VITE_EXTERNAL_FORUMS_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const forumsClient = createClient(externalForumsUrl, externalForumsAnonKey, {
  auth: {
    persistSession: false
  }
});

export type Forum = {
  id: string;
  name: string;
  brand: string;
  date: string;
  city: string;
  venue: string;
};
