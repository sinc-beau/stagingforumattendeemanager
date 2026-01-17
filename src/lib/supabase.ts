import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function extractRefFromJWT(jwt: string): string {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return '';
    const payload = JSON.parse(atob(parts[1]));
    return payload.ref || '';
  } catch {
    return '';
  }
}

const externalRef = extractRefFromJWT(serviceRoleKey);
const externalForumsUrl = externalRef ? `https://${externalRef}.supabase.co` : '';

export const forumsClient = createClient(externalForumsUrl, serviceRoleKey, {
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
