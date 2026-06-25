import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Falta configuración de Supabase. Añada VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en sus secretos.");
}

export const supabase = createClient(
  supabaseUrl || 'https://xyzcompany.supabase.co',
  supabaseKey || 'public-anon-key'
);

export const hasSupabaseConfig = !!supabaseUrl && !!supabaseKey;
