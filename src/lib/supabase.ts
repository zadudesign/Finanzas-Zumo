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

export const clearSupabaseKeys = () => {
  try {
    localStorage.removeItem('supabase.auth.token');
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
};

